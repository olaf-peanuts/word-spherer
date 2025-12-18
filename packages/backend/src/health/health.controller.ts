import { Controller, Get, Inject } from '@nestjs/common';
import { HealthCheckService, HealthCheck } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

@Controller('healthz')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    @Inject(PrismaService) private prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  async check() {
    return this.health.check([
      async () => {
        try {
          await this.prisma.$queryRaw`SELECT 1`;
          return { database: { status: 'up' } };
        } catch (e: any) {
          return { database: { status: 'down', message: e.message } };
        }
      },
    ]);
  }
}
