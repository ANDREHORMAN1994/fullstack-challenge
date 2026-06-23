import type { SettleCurrentRoundOutput } from "@/application/use-cases/settle-current-round.use-case";
import { RoundResponseDto } from "./round-response.dto";

export class SettleCurrentRoundResponseDto {
  round!: RoundResponseDto;
  lostBetsCount!: number;

  constructor(response: SettleCurrentRoundOutput) {
    this.round = new RoundResponseDto(response.round);
    this.lostBetsCount = response.lostBetsCount;
  }
}
