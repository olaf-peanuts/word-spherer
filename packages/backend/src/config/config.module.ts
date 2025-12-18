import { Module } from '@nestjs/common';
import { ConfigModule as NestConfig, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    NestConfig.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
