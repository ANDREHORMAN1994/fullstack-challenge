import { IsNotEmpty, IsString } from "class-validator";

export class CashoutBetRequestDto {
  @IsString()
  @IsNotEmpty()
  playerId!: string;
}
