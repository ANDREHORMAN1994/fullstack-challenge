import { IsInt, IsNotEmpty, IsString, Min } from "class-validator";

export class CreateRoundRequestDto {
  @IsString()
  @IsNotEmpty()
  roundId!: string;

  @IsInt()
  @Min(100)
  crashMultiplierBps!: number;
}
