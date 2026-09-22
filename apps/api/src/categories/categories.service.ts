import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CategoryDto } from '@digital-study/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { SaveCategoryRequest } from './dto/save-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<CategoryDto[]> {
    return this.prisma.category.findMany({
      select: { slug: true, name: true, description: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(input: SaveCategoryRequest): Promise<CategoryDto> {
    const existing = await this.prisma.category.findUnique({ where: { slug: input.slug } });
    if (existing) throw new ConflictException(`Category already exists: ${input.slug}`);
    return this.prisma.category.create({ data: { slug: input.slug, name: input.name.trim(), description: input.description?.trim() || null }, select: { slug: true, name: true, description: true } });
  }

  async update(slug: string, input: SaveCategoryRequest): Promise<CategoryDto> {
    if (input.slug !== slug) throw new ConflictException('Category slug cannot be changed');
    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (!existing) throw new NotFoundException(`Category not found: ${slug}`);
    return this.prisma.category.update({ where: { slug }, data: { name: input.name.trim(), description: input.description?.trim() || null }, select: { slug: true, name: true, description: true } });
  }

  async remove(slug: string): Promise<{ slug: string; deleted: true }> {
    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (!existing) throw new NotFoundException(`Category not found: ${slug}`);
    await this.prisma.category.delete({ where: { slug } });
    return { slug, deleted: true };
  }
}
