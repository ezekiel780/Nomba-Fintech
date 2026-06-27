import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @ApiOperation({ summary: 'Check API, database, and Redis health status' })
  @Get()
  async check() {
    const status: any = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      checks: {},
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      status.checks.database = 'ok';
    } catch (err) {
      status.checks.database = 'error';
      status.status = 'degraded';
    }

    try {
      await this.redis.set('health:ping', '1', 5);
      status.checks.redis = 'ok';
    } catch (err) {
      status.checks.redis = 'error';
      status.status = 'degraded';
    }

    return status;
  }
}
