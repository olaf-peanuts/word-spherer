import { Module } from '@nestjs/common';
import { GlossaryService } from './glossary.service';
import { GlossaryController } from './glossary.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [GlossaryService, PrismaService],
  controllers: [GlossaryController],
})
export class GlossaryModule {}
