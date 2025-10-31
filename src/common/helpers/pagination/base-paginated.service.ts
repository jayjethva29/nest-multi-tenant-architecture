import { QueryBuilderService } from './query-builder.service';
import { PaginationResponseDto } from '../../dto';
import { QueryOptions, QueryBuilderConfig } from '../../interfaces';

/**
 * Abstract base service class that provides common functionality for paginated queries
 * in a multi-tenant environment
 */
export abstract class BasePaginatedService<T> {
  constructor(protected readonly queryBuilderService: QueryBuilderService) {}

  /**
   * Get the entity class - must be implemented by child classes
   */
  protected abstract getEntityClass(): new () => T;

  /**
   * Get the query builder configuration - must be implemented by child classes
   */
  protected abstract getQueryBuilderConfig(): QueryBuilderConfig;

  /**
   * Find entities using a pre-built query builder
   */
  async findWithQueryBuilder(
    tenantId: string,
    baseQueryBuilder: any,
    options: QueryOptions,
  ): Promise<PaginationResponseDto<T>> {
    const config = this.getQueryBuilderConfig();

    // Apply pagination, search, and sorting to the existing query builder
    return this.queryBuilderService.buildPaginatedQueryFromBuilder(
      baseQueryBuilder,
      options,
      config,
    );
  }
}
