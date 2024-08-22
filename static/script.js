const socket = io('http://localhost:3000');
let currentNickname = '';
let currentRoom = '';
let isAgent = false;

document.getElementById('customerBtn').addEventListener('click', () => {
  socket.emit('joinAsCustomer');
  showChatArea();
  isAgent = false;
});

document.getElementById('agentBtn').addEventListener('click', () => {
  const password = prompt('비밀번호를 입력하세요:');
  socket.emit('joinAsAgent', { password });
  isAgent = true;
});

document.getElementById('sendBtn').addEventListener('click', sendMessage);
document
  .getElementById('messageInput')
  .addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

function sendMessage() {
  const message = document.getElementById('messageInput').value;
  if (message.trim()) {
    socket.emit('sendMessage', { message, room: currentRoom });
    document.getElementById('messageInput').value = '';
  }
}

socket.on('setNickname', (nickname) => {
  currentNickname = nickname;
  alert(`당신의 닉네임은 ${nickname}입니다.`);
});

socket.on('newMessage', (data) => {
  appendMessage(data);
});

socket.on('updateCustomerList', (customers) => {
  if (isAgent) {
    document.getElementById('agentArea').style.display = 'block';
    const customerList = document.getElementById('customerList');
    customerList.innerHTML = '';
    customers.forEach((customer) => {
      const li = document.createElement('li');
      li.textContent = customer.nickname;
      if (customer.hasNewMessage) {
        li.classList.add('new-message');
      }
      const replyBtn = document.createElement('button');
      replyBtn.textContent = 'Reply';
      replyBtn.onclick = () =>
        socket.emit('agentReply', { customerId: customer.id });
      li.appendChild(replyBtn);
      customerList.appendChild(li);
    });
  }
});

socket.on('joinRoom', (data) => {
  currentRoom = data.room;
  showChatArea();
  if (data.customerNickname) {
    appendSystemMessage(`${data.customerNickname}와의 채팅방에 입장했습니다.`);
    document.getElementById('messages').innerHTML = '';
    data.previousMessages.forEach(appendMessage);
  }
});

socket.on('agentJoined', (data) => {
  currentRoom = data.room;
  appendSystemMessage('상담원이 채팅방에 입장했습니다.');
});

socket.on('error', (message) => {
  alert(message);
});

function appendMessage(data) {
  const messageElement = document.createElement('p');
  messageElement.textContent = `${data.nickname}: ${data.message}`;
  document.getElementById('messages').appendChild(messageElement);
}

function appendSystemMessage(message) {
  const messageElement = document.createElement('p');
  messageElement.textContent = message;
  messageElement.classList.add('system-message');
  document.getElementById('messages').appendChild(messageElement);
}

function showChatArea() {
  document.getElementById('chatArea').style.display = 'block';
}
