import { IsNotEmpty, IsString } from "class-validator";
import { PaginationQueryDto } from "./pagination-query.dto";

export class MyBetsHistoryQueryDto extends PaginationQueryDto {
  @IsString()
  @IsNotEmpty()
  playerId!: string;
}
