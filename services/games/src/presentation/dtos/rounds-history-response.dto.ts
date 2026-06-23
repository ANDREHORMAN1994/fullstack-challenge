import type { GetRoundsHistoryOutput } from "@/application/use-cases/get-rounds-history.use-case";

export class RoundsHistoryResponseDto {
  items!: GetRoundsHistoryOutput["items"];
  pagination!: GetRoundsHistoryOutput["pagination"];

  constructor(output: GetRoundsHistoryOutput) {
    this.items = output.items;
    this.pagination = output.pagination;
  }
}
