import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  private customers: Map<string, string> = new Map(); // 소켓 ID to 닉네임
  private agents: Set<string> = new Set(); // 에이전트 소켓 ID
  private messages: Map<string, Array<{ nickname: string; message: string }>> =
    new Map(); // 고객 ID to 메시지 배열

  @SubscribeMessage('joinAsCustomer')
  handleCustomerJoin(@ConnectedSocket() client: Socket): void {
    const nickname = `고객${Math.floor(Math.random() * 1000)}`;
    this.customers.set(client.id, nickname);
    this.messages.set(client.id, []);
    client.emit('setNickname', nickname);
    this.updateAgentCustomerList();
  }

  @SubscribeMessage('joinAsAgent')
  handleAgentJoin(
    @MessageBody() data: { password: string },
    @ConnectedSocket() client: Socket,
  ): void {
    if (data.password === '1234') {
      this.agents.add(client.id);
      this.updateAgentCustomerList();
    } else {
      client.emit('error', '잘못된 비밀번호입니다.');
    }
  }

  @SubscribeMessage('sendMessage')
  handleMessage(
    @MessageBody() data: { message: string; room?: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const nickname = this.customers.get(client.id) || 'Agent';
    const messageData = { nickname, message: data.message };
    if (data.room) {
      this.server.to(data.room).emit('newMessage', messageData);
      const customerId = data.room.split('_')[1];
      this.messages.get(customerId)?.push(messageData);
    } else if (this.customers.has(client.id)) {
      this.messages.get(client.id)?.push(messageData);
      client.emit('newMessage', messageData); // 메시지를 보낸 고객에게만 전송
      this.updateAgentCustomerList(); // 상담원에게 새 메시지 알림
    }
  }

  @SubscribeMessage('agentReply')
  handleAgentReply(
    @MessageBody() data: { customerId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    if (this.agents.has(client.id)) {
      const customerSocket = this.server.sockets.sockets.get(data.customerId);
      if (customerSocket) {
        const room = `room_${data.customerId}`;
        client.join(room);
        customerSocket.join(room);
        const customerNickname = this.customers.get(data.customerId);
        const previousMessages = this.messages.get(data.customerId) || [];
        client.emit('joinRoom', { room, customerNickname, previousMessages });
        customerSocket.emit('agentJoined', { room });
      }
    }
  }

  private updateAgentCustomerList(): void {
    const customerList = Array.from(this.customers.entries()).map(
      ([id, nickname]) => ({
        id,
        nickname,
        hasNewMessage: this.messages.get(id)?.length > 0,
      }),
    );
    this.server
      .to(Array.from(this.agents))
      .emit('updateCustomerList', customerList);
  }
}
