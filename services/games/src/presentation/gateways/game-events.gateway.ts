import { OnGatewayInit, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";
import { SocketioGameEventsPublisher } from "@/infrastructure/realtime/socketio-game-events.publisher";

@WebSocketGateway({
  namespace: "/games",
  cors: {
    origin: "*",
  },
})
export class GameEventsGateway implements OnGatewayInit {
  @WebSocketServer()
  private server!: Server;

  constructor(private readonly gameEventsPublisher: SocketioGameEventsPublisher) {}

  afterInit(): void {
    this.gameEventsPublisher.attachServer(this.server);
  }
}
