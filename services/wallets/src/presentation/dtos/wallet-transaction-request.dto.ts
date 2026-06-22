import { IsNotEmpty, IsString, Matches } from "class-validator";

export class WalletTransactionRequestDto {
  @IsString()
  @IsNotEmpty()
  playerId!: string;

  @IsString()
  @IsNotEmpty()
  operationId!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[1-9]\d*$/, {
    message: "amountCents must be a positive integer string",
  })
  amountCents!: string;

  @IsString()
  @IsNotEmpty()
  referenceRoundId!: string;

  @IsString()
  @IsNotEmpty()
  referenceBetId!: string;
}
