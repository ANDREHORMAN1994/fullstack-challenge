import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

export class CreateRoundRequestDto {
  @IsString()
  @IsNotEmpty()
  roundId!: string;

  @IsString()
  @IsOptional()
  serverSeed?: string;

  @IsString()
  @IsOptional()
  clientSeed?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  nonce?: number;
}
