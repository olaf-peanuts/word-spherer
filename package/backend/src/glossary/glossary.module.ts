import { Module } from '@nestjs/common';
import { GlossaryService } from './glossary.service';
import { GlossaryController } from './glossary.controller';
import { PrismaService } from '../prisma/prisma.service';
import { TermLinksService } from './term-links.service';

@Module({
  providers: [GlossaryService, PrismaService, TermLinksService],
  controllers: [GlossaryController],
})
export class GlossaryModule {}
