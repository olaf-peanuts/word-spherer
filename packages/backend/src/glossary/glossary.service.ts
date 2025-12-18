import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTermDto } from './dtos/CreateTermDto';
import { UpdateTermDto } from './dtos/UpdateTermDto';

function generateSlug(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
}

function getInitialLetter(text: string): string {
  return text.charAt(0).toUpperCase();
}

@Injectable()
export class GlossaryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTermDto, authorId: string) {
    const slug = await this.uniqueSlug(generateSlug(dto.title));
    
    const term = await this.prisma.term.create({
      data: {
        title: dto.title,
        slug,
        language: dto.language ?? 'ja',
        kanaReading: dto.kanaReading,
        initialLetter: getInitialLetter(dto.title),
        markdownPath: `/data/md/${slug}.md`,
        htmlPath: `/data/html/${slug}.html`,
        markdownContent: dto.markdownContent,
        htmlContent: dto.markdownContent,
        authorId,
        categoryId: dto.categoryId,
      },
    });
    return term;
  }

  async findBySlug(slug: string) {
    const term = await this.prisma.term.findUnique({
      where: { slug },
      include: {
        seeLinks: { select: { target: true } },
        seenByLinks: { select: { target: true } },
      },
    });
    if (!term) throw new NotFoundException('Term not found');
    return term;
  }

  async update(id: string, dto: UpdateTermDto, userId: string) {
    const existing = await this.prisma.term.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Term not found');
    if (existing.authorId !== userId) throw new ForbiddenException();

    const slug = dto.title ? await this.uniqueSlug(generateSlug(dto.title)) : existing.slug;

    const updated = await this.prisma.term.update({
      where: { id },
      data: {
        title: dto.title,
        slug,
        markdownContent: dto.markdownContent,
        htmlContent: dto.markdownContent,
        categoryId: dto.categoryId,
      },
    });
    return updated;
  }

  async delete(id: string, userId: string) {
    const term = await this.prisma.term.findUnique({ where: { id } });
    if (!term) throw new NotFoundException('Term not found');
    if (term.authorId !== userId) throw new ForbiddenException();

    return this.prisma.term.delete({ where: { id } });
  }

  async search(query: string) {
    if (!query?.trim()) return [];

    const results = await this.prisma.term.findMany({
      where: {
        title: { contains: query, mode: 'insensitive' },
      },
      select: { id: true, title: true, slug: true },
      take: 50,
    });
    return results.map((r: any) => ({ ...r, rank: 1 }));
  }

  async getGroupedTerms() {
    const terms = await this.prisma.term.findMany({
      select: { id: true, title: true, slug: true, initialLetter: true },
      orderBy: { title: 'asc' },
    });

    const grouped: { [key: string]: any[] } = {};
    terms.forEach(term => {
      const letter = term.initialLetter || 'Other';
      if (!grouped[letter]) {
        grouped[letter] = [];
      }
      grouped[letter].push(term);
    });

    return grouped;
  }

  private async uniqueSlug(base: string): Promise<string> {
    let slug = base;
    let suffix = 1;
    while (await this.prisma.term.findUnique({ where: { slug } })) {
      slug = `${base}-${suffix++}`;
    }
    return slug;
  }
}
