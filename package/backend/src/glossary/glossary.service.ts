import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTermDto } from '../dtos/CreateTermDto';
import { UpdateTermDto } from '../dtos/UpdateTermDto';
import { generateSlug } from '../../common/src/utils/slugify';
import { getKanaReading } from '../../common/src/utils/kana';
import { getInitialLetter, getSubGroup } from '../../common/src/utils/initialLetter';
import { marked } from 'marked';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class GlossaryService {
  constructor(
    private readonly prisma: PrismaService,
    // term-links service handles See / See Also persistence
    private readonly termLinksService: TermLinksService,
  ) {}

  /** Helper: ensure slug uniqueness */
  private async uniqueSlug(base: string): Promise<string> {
    let slug = base;
    let suffix = 1;
    while (await this.prisma.term.findUnique({ where: { slug } })) {
      suffix += 1;
      slug = `${base}-${suffix}`;
    }
    return slug;
  }

  /** Helper: compute storage paths */
  private getStoragePaths(initialLetter: string, slug: string) {
    const mdPath = path.join(
      process.env.FILE_STORAGE_ROOT ?? '/data',
      'md',
      initialLetter,
      `${slug}.md`,
    );
    const htmlPath = path.join(
      process.env.FILE_STORAGE_ROOT ?? '/data',
      'html',
      initialLetter,
      `${slug}.html`,
    );
    return { mdPath, htmlPath };
  }

  /** Create a new term */
  async create(dto: CreateTermDto, authorId: string) {
    // --- Slug ---
    const rawSlug = generateSlug(dto.title);
    const slug = await this.uniqueSlug(rawSlug);

    // --- Kana reading (Japanese only) ---
    const kanaReading = getKanaReading(dto.title);

    // --- Initial Letter & SubGroup ---
    const initialLetter = getInitialLetter(dto.title, dto.language ?? 'ja');
    let subGroup: string | undefined;
    if (initialLetter) {
      // Count existing terms in this group
      const count = await this.prisma.term.count({
        where: { initialLetter },
      });
      if (count >= 50) {
        subGroup = getSubGroup(kanaReading);
      }
    }

    // --- Convert Markdown → HTML ---
    const htmlContent = marked(dto.markdownContent);

    // --- File system write ---
    const { mdPath, htmlPath } = this.getStoragePaths(initialLetter, slug);
    await fs.mkdir(path.dirname(mdPath), { recursive: true });
    await fs.mkdir(path.dirname(htmlPath), { recursive: true });
    await Promise.all([
      fs.writeFile(mdPath, dto.markdownContent, 'utf-8'),
      fs.writeFile(htmlPath, htmlContent, 'utf-8')
    ]);

    // --- DB insert (including search vector) ---
    const term = await this.prisma.term.create({
      data: {
        title: dto.title,
        slug,
        language: dto.language ?? 'ja',
        kanaReading,
        initialLetter,
        subGroup,
        markdownPath: mdPath,
        htmlPath,
        markdownContent: dto.markdownContent,
        htmlContent,
        authorId,
        categoryId: dto.categoryId,
        // `searchVector` will be filled by DB trigger (see below)
      },
    });

    // --- See / See Also links ---
    if (dto.seeIds?.length) {
      await this.termLinksService.createLinks(term.id, dto.seeIds, 'SEE');
    }
    if (dto.seeAlsoIds?.length) {
      await this.termLinksService.createLinks(term.id, dto.seeAlsoIds, 'SEE_ALSO');
    }

    // --- History record ---
    await this.prisma.termHistory.create({
      data: {
        termId: term.id,
        markdownContent: dto.markdownContent,
        htmlContent,
        authorId
      }
    });

    return term;
  }

  /** Find a term by its slug */
  async findBySlug(slug: string) {
    const term = await this.prisma.term.findUnique({
      where: { slug },
      include: {
        seeLinks: {
          where: { type: 'SEE' },
          select: { target: true }
        },
        seenByLinks: {
          where: { type: 'SEE_ALSO' },
          select: { target: true }
        }
      }
    });
    if (!term) throw new NotFoundException('Term not found');
    return term;
  }

  /** Update an existing term (author only) */
  async update(id: string, dto: UpdateTermDto, userId: string) {
    const existing = await this.prisma.term.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Term not found');
    if (existing.authorId !== userId) throw new ForbiddenException();

    // Title may have changed → recompute slug, kana, groups
    let slug = existing.slug;
    let initialLetter = existing.initialLetter;
    let subGroup = existing.subGroup;
    let kanaReading = existing.kanaReading;

    if (dto.title && dto.title !== existing.title) {
      const rawSlug = generateSlug(dto.title);
      slug = await this.uniqueSlug(rawSlug);
      kanaReading = getKanaReading(dto.title);
      initialLetter = getInitialLetter(dto.title, dto.language ?? 'ja');

      // Re‑evaluate subGroup based on count (same logic as create)
      const count = await this.prisma.term.count({ where: { initialLetter } });
      if (count >= 50) {
        subGroup = getSubGroup(kanaReading);
      }
    }

    // Markdown → HTML (if changed)
    let htmlContent = existing.htmlContent;
    if (dto.markdownContent && dto.markdownContent !== existing.markdownContent) {
      htmlContent = marked(dto.markdownContent);
    }

    // Update files
    const { mdPath, htmlPath } = this.getStoragePaths(initialLetter, slug);
    await fs.mkdir(path.dirname(mdPath), { recursive: true });
    await fs.mkdir(path.dirname(htmlPath), { recursive: true });

    if (dto.markdownContent) {
      await Promise.all([
        fs.writeFile(mdPath, dto.markdownContent, 'utf-8'),
        fs.writeFile(htmlPath, htmlContent, 'utf-8')
      ]);
    }

    // DB update
    const updated = await this.prisma.term.update({
      where: { id },
      data: {
        title: dto.title ?? undefined,
        slug,
        language: dto.language ?? undefined,
        kanaReading,
        initialLetter,
        subGroup,
        markdownPath: mdPath,
        htmlPath,
        markdownContent: dto.markdownContent ?? undefined,
        htmlContent,
        categoryId: dto.categoryId ?? undefined
      }
    });

    // Update links (replace all)
    if (dto.seeIds) {
      await this.termLinksService.replaceLinks(id, dto.seeIds, 'SEE');
    }
    if (dto.seeAlsoIds) {
      await this.termLinksService.replaceLinks(id, dto.seeAlsoIds, 'SEE_ALSO');
    }

    // History entry
    await this.prisma.termHistory.create({
      data: {
        termId: id,
        markdownContent: updated.markdownContent,
        htmlContent,
        authorId: userId
      }
    });

    return updated;
  }

  /** Delete a term (author only) */
  async delete(id: string, userId: string) {
    const term = await this.prisma.term.findUnique({ where: { id } });
    if (!term) throw new NotFoundException('Term not found');
    if (term.authorId !== userId) throw new ForbiddenException();

    // Ensure no other terms reference it
    const inboundLinks = await this.prisma.termSeeLink.count({
      where: {
        OR: [{ targetId: id }, { sourceId: id }]
      }
    });
    if (inboundLinks > 0) {
      throw new BadRequestException('Term is referenced by other terms');
    }

    // Delete files
    await Promise.allSettled([
      fs.unlink(term.markdownPath).catch(() => {}),
      fs.unlink(term.htmlPath).catch(() => {})
    ]);

    // Delete DB record (cascade deletes histories)
    return this.prisma.term.delete({ where: { id } });
  }

  /** Full‑text search */
  async search(query: string) {
    if (!query?.trim()) return [];

    // Use PostgreSQL full‑text + trigram similarity
    const tsQuery = query
      .trim()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .map(w => `${w}:*`)
      .join(' & ');

    const results = await this.prisma.$queryRaw<
      Array<{
        id: string;
        title: string;
        slug: string;
        rank: number;
      }>
    >`
      SELECT
        t.id,
        t.title,
        t.slug,
        ts_rank_cd(t.searchVector, to_tsquery('japanese', ${tsQuery}), 32) AS rank
      FROM "Term" t
      WHERE t.searchVector @@ to_tsquery('japanese', ${tsQuery})
      ORDER BY rank DESC
      LIMIT 50;
    `;
    return results;
  }

  /** Get terms grouped by initialLetter (for accordion UI) */
  async getGroupedTerms() {
    const terms = await this.prisma.term.findMany({
      orderBy: [{ initialLetter: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        title: true,
        slug: true,
        initialLetter: true,
        subGroup: true
      }
    });

    // Group in memory (could be done via SQL too)
    const groups: Record<string, any[]> = {};
    for (const term of terms) {
      const key = term.subGroup ? `${term.initialLetter}-${term.subGroup}` : term.initialLetter;
      if (!groups[key]) groups[key] = [];
      groups[key].push(term);
    }
    return groups;
  }
}
