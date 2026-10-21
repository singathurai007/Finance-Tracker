import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Category } from '../generated/prisma/client.js';
import { isUniqueViolation } from '../common/prisma-errors.js';
import { PrismaService } from '../prisma.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<Category[]> {
    return this.prisma.category.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: number): Promise<Category> {
    const category = await this.prisma.category.findUnique({ where: { id } });

    if (!category) {
      throw new NotFoundException(`Category ${id} was not found`);
    }

    return category;
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    try {
      return await this.prisma.category.create({
        data: {
          name: dto.name.trim(),
          type: dto.type,
          color: dto.color ?? '#64748b',
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(`A category named "${dto.name}" already exists.`);
      }
      throw error;
    }
  }

  async update(id: number, dto: UpdateCategoryDto): Promise<Category> {
    await this.findOne(id);

    try {
      return await this.prisma.category.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          type: dto.type,
          color: dto.color,
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(`A category named "${dto.name}" already exists.`);
      }
      throw error;
    }
  }

  /**
   * Deleting a category keeps its transactions — they simply become
   * "Uncategorized" because the relation uses `SetNull`.
   */
  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.prisma.category.delete({ where: { id } });
  }
}
