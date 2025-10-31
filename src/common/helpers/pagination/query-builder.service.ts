import { Injectable, BadRequestException } from '@nestjs/common';
import { SelectQueryBuilder, Repository } from 'typeorm';
import { PaginationQueryDto, PaginationResponseDto, PaginationMetaDto, SortOrder } from '../../dto';
import { QueryBuilderConfig, QueryOptions, SearchConfig, SortConfig } from '../../interfaces';

@Injectable()
export class QueryBuilderService {
  /**
   * Apply search conditions to the query builder
   */
  private applySearch<T>(
    queryBuilder: SelectQueryBuilder<T>,
    searchTerm: string,
    config: SearchConfig,
    alias: string,
  ): void {
    if (!searchTerm || !config.searchFields.length) return;

    if (config.customSearch) {
      config.customSearch(queryBuilder, searchTerm, alias);
      return;
    }

    const searchConditions = config.searchFields
      .map((field) => `${alias}.${field} ILIKE :search`)
      .join(' OR ');

    queryBuilder.andWhere(`(${searchConditions})`, {
      search: `%${searchTerm}%`,
    });
  }

  /**
   * Apply sorting to the query builder
   */
  private applySorting<T>(
    queryBuilder: SelectQueryBuilder<T>,
    sortBy: string,
    sortOrder: SortOrder,
    config: SortConfig,
    alias: string,
  ): void {
    const sortField = config.allowedSortFields.includes(sortBy) ? sortBy : config.defaultSortField;

    this.validateSortField(sortField, config.allowedSortFields);

    queryBuilder.orderBy(`${alias}.${sortField}`, sortOrder);
  }

  /**
   * Apply pagination to the query builder
   */
  private applyPagination<T>(
    queryBuilder: SelectQueryBuilder<T>,
    page: number,
    limit: number,
  ): void {
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);
  }

  /**
   * Build a paginated query from an existing query builder
   */
  async buildPaginatedQueryFromBuilder<T>(
    queryBuilder: SelectQueryBuilder<T>,
    options: QueryOptions,
    config: QueryBuilderConfig,
    alias?: string,
  ): Promise<PaginationResponseDto<T>> {
    // Use the first alias from the query builder if not provided
    const entityAlias = alias || queryBuilder.alias;

    // Apply search
    if (options.search && config.search) {
      this.applySearch(queryBuilder, options.search, config.search, entityAlias);
    }

    // Apply sorting
    if (config.sort) {
      const sortBy = options.sortBy || config.sort.defaultSortField;
      const sortOrder = options.sortOrder || config.sort.defaultSortOrder;
      this.applySorting(queryBuilder, sortBy, sortOrder, config.sort, entityAlias);
    }

    // Get total count before applying pagination
    const total = await queryBuilder.getCount();

    // Apply pagination
    const page = options.page || 1;
    const limit = Math.min(
      options.limit || config.pagination?.defaultLimit || 10,
      config.pagination?.maxLimit || 100,
    );

    this.applyPagination(queryBuilder, page, limit);

    // Execute query
    const data = await queryBuilder.getMany();

    // Create pagination metadata
    const meta = new PaginationMetaDto(page, limit, total);

    return new PaginationResponseDto(data, meta);
  }

  /**
   * Validate sort field against allowed fields
   */
  validateSortField(sortBy: string, allowedFields: string[]): string {
    if (!allowedFields.includes(sortBy)) {
      throw new BadRequestException(
        `Invalid sort field: ${sortBy}. Allowed fields: ${allowedFields.join(', ')}`,
      );
    }
    return sortBy;
  }
}
