import { Clock } from "@/application/providers/clock";

export class SystemClock extends Clock {
  now(): Date {
    return new Date();
  }
}
