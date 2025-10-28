import { DataSource } from 'typeorm';

export const TENANT_DATA_SOURCE = 'TENANT_DATA_SOURCE';
export const TENANT_ID = 'TENANT_ID';

export interface TenantContext {
  tenantId: string;
  dataSource: DataSource;
}

export const createTenantProvider = () => {
  return {
    provide: TENANT_DATA_SOURCE,
    useFactory: () => {
      throw new Error('TenantDataSource provider should be overridden in request scope');
    },
  };
};
