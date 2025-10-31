import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query-v2.dto';
import { TenantConnectionManager } from '../../core/connection/tenant-connection.manager';
import {
  BasePaginatedService,
  QueryBuilderService,
  QueryBuilderConfig,
  PaginationResponseDto,
  QueryOptions,
  SortOrder,
} from '../../common';

@Injectable()
export class ProductsService extends BasePaginatedService<Product> {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private tenantConnectionManager: TenantConnectionManager,
    queryBuilderService: QueryBuilderService,
  ) {
    super(queryBuilderService);
  }

  protected getEntityClass(): new () => Product {
    return Product;
  }

  protected getQueryBuilderConfig(): QueryBuilderConfig {
    return {
      search: {
        searchFields: ['name', 'description', 'sku', 'category'],
      },
      sort: {
        defaultSortField: 'createdAt',
        allowedSortFields: ['name', 'price', 'createdAt', 'updatedAt', 'stockQuantity'],
        defaultSortOrder: SortOrder.DESC,
      },
      pagination: {
        defaultLimit: 10,
        maxLimit: 100,
      },
    };
  }

  private async getTenantProductRepository(tenantId: string): Promise<Repository<Product>> {
    return this.tenantConnectionManager.getTenantRepository(tenantId, Product);
  }

  /**
   * Find all products with advanced filtering
   */
  async findAll(
    tenantId: string,
    queryDto: ProductQueryDto,
  ): Promise<PaginationResponseDto<Product>> {
    const options: QueryOptions = {
      page: queryDto.page,
      limit: queryDto.limit,
      search: queryDto.search,
      sortBy: queryDto.sortBy,
      sortOrder: queryDto.sortOrder,
    };

    const productRepository = await this.getTenantProductRepository(tenantId);
    const baseQuery = productRepository.createQueryBuilder('product');

    // Add category filter if provided
    if (queryDto.category) {
      baseQuery.andWhere('product.category = :category', { category: queryDto.category });
    }

    // Add active filter if provided
    if (queryDto.active !== undefined) {
      baseQuery.andWhere('product.active = :active', { active: queryDto.active });
    }

    return this.findWithQueryBuilder(tenantId, baseQuery, options);
  }

  /**
   * Create a new product
   */
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

  /**
   * Find a product by ID
   */
  async findOne(tenantId: string, id: string): Promise<Product> {
    const repository = await this.getTenantProductRepository(tenantId);
    const product = await repository.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    return product;
  }

  /**
   * Update a product
   */
  async update(tenantId: string, id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const repository = await this.getTenantProductRepository(tenantId);

    const product = await this.findOne(tenantId, id);

    // Check if SKU already exists (if it's being updated)
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

  /**
   * Remove a product
   */
  async remove(tenantId: string, id: string): Promise<void> {
    const repository = await this.getTenantProductRepository(tenantId);
    const product = await this.findOne(tenantId, id);

    await repository.remove(product);
    this.logger.log(`Product removed: ${id} for tenant: ${tenantId}`);
  }

  /**
   * Find products by category with pagination
   */
  async findByCategory(
    tenantId: string,
    category: string,
    options: Partial<QueryOptions> = {},
  ): Promise<PaginationResponseDto<Product>> {
    const queryOptions: QueryOptions = {
      page: options.page || 1,
      limit: options.limit || 10,
      search: options.search,
      sortBy: options.sortBy || 'name',
      sortOrder: options.sortOrder || SortOrder.ASC,
    };

    const productRepository = await this.getTenantProductRepository(tenantId);
    const baseQuery = productRepository
      .createQueryBuilder('product')
      .where('product.category = :category', { category });

    return this.findWithQueryBuilder(tenantId, baseQuery, queryOptions);
  }

  /**
   * Find low stock products
   */
  async findLowStockProducts(
    tenantId: string,
    threshold: number = 10,
    options: Partial<QueryOptions> = {},
  ): Promise<PaginationResponseDto<Product>> {
    const queryOptions: QueryOptions = {
      page: options.page || 1,
      limit: options.limit || 10,
      search: options.search,
      sortBy: options.sortBy || 'stockQuantity',
      sortOrder: options.sortOrder || SortOrder.ASC,
    };

    const productRepository = await this.getTenantProductRepository(tenantId);
    const baseQuery = productRepository
      .createQueryBuilder('product')
      .where('product.stockQuantity <= :threshold', { threshold })
      .andWhere('product.active = :active', { active: true });

    return this.findWithQueryBuilder(tenantId, baseQuery, queryOptions);
  }

  /**
   * Search products in a price range
   */
  async findInPriceRange(
    tenantId: string,
    minPrice: number,
    maxPrice: number,
    options: Partial<QueryOptions> = {},
  ): Promise<PaginationResponseDto<Product>> {
    const queryOptions: QueryOptions = {
      page: options.page || 1,
      limit: options.limit || 10,
      search: options.search,
      sortBy: options.sortBy || 'price',
      sortOrder: options.sortOrder || SortOrder.ASC,
    };

    const productRepository = await this.getTenantProductRepository(tenantId);
    const baseQuery = productRepository
      .createQueryBuilder('product')
      .where('product.price BETWEEN :minPrice AND :maxPrice', { minPrice, maxPrice })
      .andWhere('product.active = :active', { active: true });

    return this.findWithQueryBuilder(tenantId, baseQuery, queryOptions);
  }
}
