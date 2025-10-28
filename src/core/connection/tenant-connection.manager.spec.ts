import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantConnectionManager } from './tenant-connection.manager';
import { Tenant } from '../tenant/tenant.entity';

describe('TenantConnectionManager', () => {
  let service: TenantConnectionManager;
  let tenantRepository: Repository<Tenant>;

  const mockTenantRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantConnectionManager,
        {
          provide: getRepositoryToken(Tenant),
          useValue: mockTenantRepository,
        },
      ],
    }).compile();

    service = module.get<TenantConnectionManager>(TenantConnectionManager);
    tenantRepository = module.get<Repository<Tenant>>(getRepositoryToken(Tenant));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDataSourceForTenant', () => {
    it('should throw error for non-existent tenant', async () => {
      mockTenantRepository.findOne.mockResolvedValue(null);

      await expect(service.getDataSourceForTenant('non-existent')).rejects.toThrow(
        'Tenant not found or inactive: non-existent',
      );
    });

    it('should throw error for inactive tenant', async () => {
      const inactiveTenant = {
        id: '1',
        tenantId: 'inactive-tenant',
        active: false,
      };

      mockTenantRepository.findOne.mockResolvedValue(inactiveTenant);

      await expect(service.getDataSourceForTenant('inactive-tenant')).rejects.toThrow(
        'Tenant not found or inactive: inactive-tenant',
      );
    });
  });

  describe('getConnectionStatus', () => {
    it('should return empty status when no connections exist', () => {
      const status = service.getConnectionStatus();
      expect(status).toEqual({});
    });
  });

  describe('closeAllConnections', () => {
    it('should complete without error when no connections exist', async () => {
      await expect(service.closeAllConnections()).resolves.not.toThrow();
    });
  });
});
