# Pagination, Search, and Sorting Service

This document describes the comprehensive pagination, search, and sorting service for the multi-tenant NestJS backend.

## Overview

The pagination service provides a unified approach to handle:
- **Pagination**: Limit and offset-based pagination with metadata
- **Searching**: Full-text search across configurable fields
- **Sorting**: Dynamic sorting by allowed fields with configurable defaults
- **Multi-tenant Support**: Built-in tenant isolation

## Architecture

### Core Components

1. **QueryBuilderService**: Main service for building TypeORM queries
2. **BasePaginatedService**: Abstract base class for entity services
3. **DTOs**: Request/response data transfer objects
4. **Interfaces**: Type definitions for configuration and options

### File Structure

```
src/common/
├── dto/
│   ├── pagination-query.dto.ts       # Base pagination request DTO
│   ├── pagination-response.dto.ts    # Pagination response with metadata
│   └── index.ts
├── interfaces/
│   ├── query-builder.interface.ts    # Configuration interfaces
│   └── index.ts
├── helpers/
│   └── pagination/
│       ├── query-builder.service.ts      # Core query building logic
│       ├── base-paginated.service.ts     # Abstract base service
│       └── index.ts
├── common.module.ts                   # Global module registration
└── index.ts
```

## Usage

### 1. Basic Setup

First, ensure the `CommonModule` is imported in your `AppModule`:

```typescript
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    CommonModule,
    // ... other modules
  ],
})
export class AppModule {}
```

### 2. Creating a Service

Extend the `BasePaginatedService` to create a paginated service:

```typescript
import { Injectable } from '@nestjs/common';
import { 
  BasePaginatedService, 
  QueryBuilderService, 
  QueryBuilderConfig,
  SortOrder,
  QueryOptions,
  PaginationResponseDto
} from '../../common';

@Injectable()
export class ProductsService extends BasePaginatedService<Product> {
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
        searchFields: ['name', 'description', 'sku'],
      },
      sort: {
        defaultSortField: 'createdAt',
        allowedSortFields: ['name', 'price', 'createdAt'],
        defaultSortOrder: SortOrder.DESC,
      },
      pagination: {
        defaultLimit: 10,
        maxLimit: 100,
      },
    };
  }

  private async getTenantRepository(tenantId: string) {
    return this.tenantConnectionManager.getTenantRepository(tenantId, Product);
  }

  // Example method using the pagination service
  async findAll(tenantId: string, queryDto: ProductQueryDto): Promise<PaginationResponseDto<Product>> {
    const options: QueryOptions = {
      page: queryDto.page,
      limit: queryDto.limit,
      search: queryDto.search,
      sortBy: queryDto.sortBy,
      sortOrder: queryDto.sortOrder,
    };

    // Create base query with custom logic
    const productRepository = await this.getTenantRepository(tenantId);
    const baseQuery = productRepository.createQueryBuilder('product');

    // Add custom filters
    if (queryDto.category) {
      baseQuery.andWhere('product.category = :category', { category: queryDto.category });
    }

    if (queryDto.active !== undefined) {
      baseQuery.andWhere('product.active = :active', { active: queryDto.active });
    }

    // Apply pagination, search, and sorting
    return this.findWithQueryBuilder(tenantId, baseQuery, options);
  }
  }
}
```

### 3. Creating Custom DTOs

Create query DTOs that extend the base pagination DTO:

```typescript
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto';

export class ProductQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by category' })
  @IsOptional()
  @IsString()
  category?: string;
}
```

### 4. Controller Implementation

Use the service in your controllers:

```typescript
@Get()
@ApiOperation({ summary: 'Get products with pagination' })
findAll(
  @CurrentUser() user: any,
  @Query() query: ProductQueryDto,
): Promise<PaginationResponseDto<Product>> {
  return this.productsService.findAll(user.tenantId, query);
}
```

## API Features

### Query Parameters

All paginated endpoints support these query parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number (1-based) |
| `limit` | number | 10 | Items per page (max 100) |
| `search` | string | - | Search term across configured fields |
| `sortBy` | string | 'createdAt' | Field to sort by |
| `sortOrder` | 'ASC' \| 'DESC' | 'DESC' | Sort direction |

### Response Format

All paginated responses follow this structure:

```typescript
{
  "data": [...],           // Array of entities
  "meta": {
    "page": 1,             // Current page
    "limit": 10,           // Items per page
    "total": 50,           // Total items
    "totalPages": 5,       // Total pages
    "hasNextPage": true,   // Has next page
    "hasPrevPage": false   // Has previous page
  }
}
```

## Advanced Features

### 1. Custom Search Logic

Implement custom search logic for complex scenarios:

```typescript
protected getQueryBuilderConfig(): QueryBuilderConfig {
  return {
    search: {
      searchFields: ['name', 'description'],
      customSearch: (queryBuilder, searchTerm, alias) => {
        queryBuilder.andWhere(
          `(${alias}.name ILIKE :search OR ${alias}.description ILIKE :search OR ${alias}.tags::text ILIKE :search)`,
          { search: `%${searchTerm}%` }
        );
      },
    },
    // ... other config
  };
}
```

## Example Implementations

### Products Service

```typescript
// Find products by category
async findByCategory(
  tenantId: string, 
  category: string, 
  options: Partial<QueryOptions> = {}
): Promise<PaginationResponseDto<Product>> {
  const queryOptions: QueryOptions = {
    page: options.page || 1,
    limit: options.limit || 10,
    search: options.search,
    sortBy: options.sortBy || 'name',
    sortOrder: options.sortOrder || SortOrder.ASC,
  };

  const productRepository = await this.getTenantRepository(tenantId);
  const baseQuery = productRepository
    .createQueryBuilder('product')
    .where('product.category = :category', { category });

  return this.findWithQueryBuilder(tenantId, baseQuery, queryOptions);
}

// Find products in price range
async findInPriceRange(
  tenantId: string,
  minPrice: number,
  maxPrice: number,
  options: Partial<QueryOptions> = {}
): Promise<PaginationResponseDto<Product>> {
  const queryOptions: QueryOptions = {
    page: options.page || 1,
    limit: options.limit || 10,
    search: options.search,
    sortBy: options.sortBy || 'price',
    sortOrder: options.sortOrder || SortOrder.ASC,
  };

  const productRepository = await this.getTenantRepository(tenantId);
  const baseQuery = productRepository
    .createQueryBuilder('product')
    .where('product.price BETWEEN :minPrice AND :maxPrice', { minPrice, maxPrice })
    .andWhere('product.active = :active', { active: true });

  return this.findWithQueryBuilder(tenantId, baseQuery, queryOptions);
}
```

### Users Service

```typescript
// Find users with roles relation
async findUsersWithRoles(
  tenantId: string, 
  options: Partial<QueryOptions> = {}
): Promise<PaginationResponseDto<User>> {
  const userRepository = await this.getTenantRepository(tenantId);
  const baseQuery = userRepository
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.userRoles', 'userRoles');
  
  return this.findWithQueryBuilder(tenantId, baseQuery, options);
}

// Find users by role
async findByRole(
  tenantId: string,
  role: string,
  options: Partial<QueryOptions> = {}
): Promise<PaginationResponseDto<User>> {
  const queryOptions: QueryOptions = {
    page: options.page || 1,
    limit: options.limit || 10,
    search: options.search,
    sortBy: options.sortBy || 'firstName',
    sortOrder: options.sortOrder || SortOrder.ASC,
  };

  const userRepository = await this.getTenantRepository(tenantId);
  const baseQuery = userRepository
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.userRoles', 'userRoles')
    .where('user.role = :role', { role });

  return this.findWithQueryBuilder(tenantId, baseQuery, queryOptions);
}
```

## Testing

### Unit Testing

```typescript
describe('ProductsService', () => {
  let service: ProductsService;
  let queryBuilderService: QueryBuilderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: QueryBuilderService,
          useValue: mockQueryBuilderService,
        },
        {
          provide: TenantConnectionManager,
          useValue: mockTenantConnectionManager,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    queryBuilderService = module.get<QueryBuilderService>(QueryBuilderService);
  });

  it('should return paginated products', async () => {
    const mockResult = {
      data: [mockProduct],
      meta: new PaginationMetaDto(1, 10, 1),
    };

    jest.spyOn(queryBuilderService, 'buildPaginatedQueryFromBuilder')
        .mockResolvedValue(mockResult);

    const result = await service.findAll('tenant-id', { page: 1, limit: 10 });

    expect(result).toEqual(mockResult);
    expect(queryBuilderService.buildPaginatedQueryFromBuilder).toHaveBeenCalled();
  });
});
```

## Best Practices

1. **Validation**: Always validate query parameters using class-validator decorators
2. **Limits**: Set reasonable maximum limits to prevent performance issues
3. **Indexes**: Ensure database indexes exist for frequently searched/sorted fields
4. **Caching**: Consider caching for frequently accessed paginated data
5. **Error Handling**: Implement proper error handling for invalid query parameters
6. **Documentation**: Use Swagger decorators for API documentation

## Performance Considerations

1. **Database Indexing**: Create indexes on:
   - Frequently searched fields
   - Sort fields
   - Filter fields
   - Foreign key relationships

2. **Query Optimization**:
   - Use `select` to limit returned fields
   - Avoid N+1 queries with proper relations
   - Use query builders efficiently

3. **Caching Strategy**:
   - Cache frequently accessed pages
   - Implement cache invalidation on data changes
   - Use Redis for distributed caching

4. **Monitoring**:
   - Track slow queries
   - Monitor memory usage
   - Set up alerts for performance degradation