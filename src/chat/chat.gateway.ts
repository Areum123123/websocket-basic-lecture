import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: 'chat' }) // 웹소켓 서버 설정 데코레이터: 네임스페이스 추가
export class ChatGateway {
  @WebSocketServer() server: Server; // 웹소켓 서버 인스턴스 선언

  @SubscribeMessage('message') // message 이벤트 구독
  handleMessage(socket: Socket, data: any): void {
    const { message, nickname } = data; // 메시지와 닉네임을 데이터에서 추출
    // 접속한 클라이언트들에 메시지 전송
    socket.broadcast.emit('message', `${nickname}: ${message}`);
  }
}

@WebSocketGateway({ namespace: 'room' })
export class RoomGateway {
  // 채팅 게이트웨이 의존성 주입
  constructor(private readonly chatGateway: ChatGateway) {}
  rooms = [];

  @WebSocketServer()
  server: Server;

  @SubscribeMessage('createRoom')
  handleMessage(@MessageBody() data) {
    const { nickname, room } = data;
    // 방 생성시 이벤트 발생시켜 클라이언트에 송신
    this.chatGateway.server.emit('notice', {
      message: `${nickname}님이 ${room}방을 만들었습니다.`,
    });
    this.rooms.push(room); // 채팅방 정보 받아서 추가
    this.server.emit('rooms', this.rooms); // rooms 이벤트로 채팅방 리스트 전송
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(socket: Socket, data) {
    const { nickname, room, toLeaveRoom } = data;
    if (toLeaveRoom) {
      socket.leave(toLeaveRoom); // 이전 방에서 나가기
    }
    socket.join(room); // 새로운 방에 입장

    this.chatGateway.server.emit('notice', {
      message: `${nickname}님이 ${room}방에 입장했습니다.`,
    });
  }

  @SubscribeMessage('message')
  handleMessageToRoom(socket: Socket, data) {
    const { nickname, room, message } = data;
    console.log(data);
    // 방에 있는 모든 클라이언트에게 메시지 전송 (자신 포함)
    this.server.to(room).emit('message', {
      message: `${nickname}: ${message}`,
    });
  }
}
