import { IsOptional, IsString, Length } from "class-validator";

export class CreateWalletRequestDto {
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}
