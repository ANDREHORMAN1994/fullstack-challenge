export class HealthCheckResponseDto {
  status: string;
  service: string;

  constructor({ status, service }: { readonly status: string; readonly service: string }) {
    this.status = status;
    this.service = service;
  }
}
