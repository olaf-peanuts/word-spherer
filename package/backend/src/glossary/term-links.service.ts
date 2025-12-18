import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EnumTermLinkType } from '@prisma/client';

@Injectable()
export class TermLinksService {
  constructor(private readonly prisma: PrismaService) {}

  /** Create multiple links of a given type */
  async createLinks(sourceId: string, targetIds: string[], type: EnumTermLinkType) {
    const data = targetIds.map(tid => ({
      sourceId,
      targetId: tid,
      type
    }));
    // Ensure referential integrity (target must exist)
    for (const tid of targetIds) {
      const exists = await this.prisma.term.findUnique({ where: { id: tid } });
      if (!exists) throw new BadRequestException(`Target term ${tid} does not exist`);
    }
    await this.prisma.termSeeLink.createMany({ data, skipDuplicates: true });
  }

  /** Replace all links of a type for a source */
  async replaceLinks(sourceId: string, targetIds: string[], type: EnumTermLinkType) {
    await this.prisma.termSeeLink.deleteMany({
      where: { sourceId, type }
    });
    if (targetIds.length) {
      await this.createLinks(sourceId, targetIds, type);
    }
  }
}
