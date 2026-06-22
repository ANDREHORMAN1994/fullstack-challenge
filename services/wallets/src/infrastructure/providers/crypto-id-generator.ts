import { IdGenerator } from "@/application/providers/id-generator";

export class CryptoIdGenerator extends IdGenerator {
  generate(): string {
    return crypto.randomUUID();
  }
}
