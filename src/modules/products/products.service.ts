import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { TenantConnectionManager } from '../../core/connection/tenant-connection.manager';

export interface PaginatedProducts {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly tenantConnectionManager: TenantConnectionManager) {}

  async create(tenantId: string, createProductDto: CreateProductDto): Promise<Product> {
    const repository = await this.getTenantProductRepository(tenantId);

    // Check if SKU already exists
    const existingProduct = await repository.findOne({
      where: { sku: createProductDto.sku },
    });

    if (existingProduct) {
      throw new ConflictException(`Product with SKU '${createProductDto.sku}' already exists`);
    }

    const product = repository.create(createProductDto);
    const savedProduct = await repository.save(product);

    this.logger.log(`Product created: ${savedProduct.id} for tenant: ${tenantId}`);
    return savedProduct;
  }

  async findAll(tenantId: string, queryDto: ProductQueryDto): Promise<PaginatedProducts> {
    const repository = await this.getTenantProductRepository(tenantId);
    const { page, limit, search, category, active, sortBy, sortOrder } = queryDto;

    const queryBuilder = repository.createQueryBuilder('product');

    // Apply filters
    if (search) {
      queryBuilder.andWhere('(product.name ILIKE :search OR product.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (category) {
      queryBuilder.andWhere('product.category = :category', { category });
    }

    if (active !== undefined) {
      queryBuilder.andWhere('product.active = :active', { active });
    }

    // Apply sorting
    queryBuilder.orderBy(`product.${sortBy}`, sortOrder);

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(tenantId: string, id: string): Promise<Product> {
    const repository = await this.getTenantProductRepository(tenantId);
    const product = await repository.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    return product;
  }

  async update(tenantId: string, id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const repository = await this.getTenantProductRepository(tenantId);
    const product = await this.findOne(tenantId, id);

    // Check SKU uniqueness if being updated
    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const existingProduct = await repository.findOne({
        where: { sku: updateProductDto.sku },
      });

      if (existingProduct) {
        throw new ConflictException(`Product with SKU '${updateProductDto.sku}' already exists`);
      }
    }

    Object.assign(product, updateProductDto);
    const updatedProduct = await repository.save(product);

    this.logger.log(`Product updated: ${updatedProduct.id} for tenant: ${tenantId}`);
    return updatedProduct;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const repository = await this.getTenantProductRepository(tenantId);
    const product = await this.findOne(tenantId, id);

    await repository.remove(product);
    this.logger.log(`Product deleted: ${id} for tenant: ${tenantId}`);
  }

  async findBySku(tenantId: string, sku: string): Promise<Product> {
    const repository = await this.getTenantProductRepository(tenantId);
    const product = await repository.findOne({ where: { sku } });

    if (!product) {
      throw new NotFoundException(`Product with SKU '${sku}' not found`);
    }

    return product;
  }

  private async getTenantProductRepository(tenantId: string): Promise<Repository<Product>> {
    return this.tenantConnectionManager.getTenantRepository(tenantId, Product);
  }
}
