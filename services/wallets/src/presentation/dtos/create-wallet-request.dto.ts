import { IsNotEmpty, IsOptional, IsString, Length } from "class-validator";

export class CreateWalletRequestDto {
  @IsString()
  @IsNotEmpty()
  playerId!: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}
