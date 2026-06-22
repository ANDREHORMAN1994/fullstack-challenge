import { IsNotEmpty, IsString, Matches } from "class-validator";

export class PlaceBetRequestDto {
  @IsString()
  @IsNotEmpty()
  playerId!: string;

  @IsString()
  @IsNotEmpty()
  roundId!: string;

  @IsString()
  @IsNotEmpty()
  betId!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[1-9]\d*$/, {
    message: "amountCents must be a positive integer string",
  })
  amountCents!: string;
}
