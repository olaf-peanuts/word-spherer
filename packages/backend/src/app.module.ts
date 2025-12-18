import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GlossaryModule } from './glossary/glossary.module';
import { CategoryModule } from './category/category.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    PrismaModule,
    GlossaryModule,
    CategoryModule,
    AuthModule,
    HealthModule
  ],
})
export class AppModule {}
