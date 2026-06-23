import { Injectable } from "@nestjs/common";
import { Server } from "socket.io";
import { GameEvent, GameEventsPublisher } from "@/application/events/game-events.publisher";

@Injectable()
export class SocketioGameEventsPublisher extends GameEventsPublisher {
  private server?: Server;
  private readonly publishedEvents: GameEvent[] = [];

  attachServer(server: Server): void {
    this.server = server;
  }

  publish(event: GameEvent): void {
    this.publishedEvents.push(event);
    this.server?.emit(event.name, event.payload);
  }

  getPublishedEvents(): GameEvent[] {
    return [...this.publishedEvents];
  }
}
