// socket.io 인스턴스 생성
const socket = io('http://localhost:3000/chat');
const roomSocket = io('http://localhost:3000/room');
const nickname = prompt('닉네임을 입력해주세요');
let currentRoom = '';

// 공지 이벤트를 받아서 처리
socket.on('notice', (data) => {
  $('#notice').append(`<div>${data.message}</div>`);
});

socket.on('connect', () => {
  console.log('connected'); //서버 접속 확인을 위한 이벤트
});

function sendMessage() {
  if (currentRoom === '') {
    alert('방을 선택해 주세요');
    return;
  }
  const message = $('#message').val();
  const data = { message, nickname, room: currentRoom };

  roomSocket.emit('message', data); // 서버로 메시지 전송
  $('#message').val(''); // 메시지 입력란 초기화
  return false;
}

// 채팅방 내에서 대화를 나눌 때 사용하는 이벤트
roomSocket.on('message', (data) => {
  $('#chat').append(`<div>${data.message}</div>`); // 방에 전송된 메시지 표시
});

// 채팅방 생성 버튼 클릭시 실행하는 함수
function createRoom() {
  const room = prompt('생성할 방의 이름을 입력해주세요.');
  roomSocket.emit('createRoom', { room, nickname });
}

// 클라이언트 측에서 채팅방 추가하는 함수
roomSocket.on('rooms', (data) => {
  $('#rooms').empty(); // 채팅방 목록 초기화
  data.forEach((room) => {
    $('#rooms').append(
      `<li>${room}<button onclick="joinRoom('${room}')">join</button></li>`,
    );
  });
});

// 방에 들어갈 때 기존에 있던 방에서는 나가기
function joinRoom(room) {
  roomSocket.emit('joinRoom', { room, nickname, toLeaveRoom: currentRoom });
  $('#chat').html(''); // 채팅방 이동시 기존 메시지 삭제
  currentRoom = room; // 현재 들어있는 방의 값을 변경
}
