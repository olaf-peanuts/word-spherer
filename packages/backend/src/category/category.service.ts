import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function generateSlug(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
}

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany();
  }

  async create(name: string, parentId?: string) {
    const slug = await this.uniqueSlug(generateSlug(name));
    return this.prisma.category.create({
      data: { name, slug, parentId }
    });
  }

  private async uniqueSlug(base: string): Promise<string> {
    let slug = base;
    let suffix = 1;
    while (await this.prisma.category.findUnique({ where: { slug } })) {
      suffix += 1;
      slug = `${base}-${suffix}`;
    }
    return slug;
  }

  async update(id: string, dto: { name?: string; parentId?: string }) {
    const data: any = {};
    if (dto.name) {
      data.name = dto.name;
      data.slug = await this.uniqueSlug(generateSlug(dto.name));
    }
    if (dto.parentId !== undefined) data.parentId = dto.parentId;

    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    const exists = await this.prisma.category.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Category not found');
    // Prevent deletion if terms belong to it
    const termCount = await this.prisma.term.count({
      where: { categoryId: id }
    });
    if (termCount > 0) {
      throw new Error('Cannot delete category with attached terms');
    }

    return this.prisma.category.delete({ where: { id } });
  }
}
