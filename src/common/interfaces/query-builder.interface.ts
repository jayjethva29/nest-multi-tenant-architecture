import { SelectQueryBuilder } from 'typeorm';
import { PaginationQueryDto, SortOrder } from '../dto';

export interface SearchConfig {
  /**
   * Fields to search in when a search term is provided
   * Example: ['name', 'email', 'description']
   */
  searchFields: string[];

  /**
   * Custom search logic function
   * If provided, this will be used instead of the default ILIKE search
   */
  customSearch?: (queryBuilder: SelectQueryBuilder<any>, searchTerm: string, alias: string) => void;
}

export interface SortConfig {
  /**
   * Default field to sort by
   */
  defaultSortField: string;

  /**
   * Allowed fields for sorting
   */
  allowedSortFields: string[];

  /**
   * Default sort order
   */
  defaultSortOrder: SortOrder;
}

export interface PaginationConfig {
  /**
   * Default page size
   */
  defaultLimit: number;

  /**
   * Maximum allowed page size
   */
  maxLimit: number;
}

export interface QueryBuilderConfig {
  search?: SearchConfig;
  sort?: SortConfig;
  pagination?: PaginationConfig;
}

export interface QueryOptions extends PaginationQueryDto {
  // // Explicitly re-declare inherited properties for better TypeScript support
  // page?: number;
  // limit?: number;
  // search?: string;
  // sortBy?: string;
  // sortOrder?: SortOrder;
}
