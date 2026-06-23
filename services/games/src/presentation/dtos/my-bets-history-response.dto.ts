import type { GetMyBetsHistoryOutput } from "@/application/use-cases/get-my-bets-history.use-case";

export class MyBetsHistoryResponseDto {
  items!: GetMyBetsHistoryOutput["items"];
  pagination!: GetMyBetsHistoryOutput["pagination"];

  constructor(output: GetMyBetsHistoryOutput) {
    this.items = output.items;
    this.pagination = output.pagination;
  }
}
