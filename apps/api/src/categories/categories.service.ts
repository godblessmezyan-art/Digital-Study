import { Injectable } from '@nestjs/common';
import type { CategoryDto } from '@digital-study/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<CategoryDto[]> {
    return this.prisma.category.findMany({
      select: { slug: true, name: true, description: true },
      orderBy: { name: 'asc' },
    });
  }
}
