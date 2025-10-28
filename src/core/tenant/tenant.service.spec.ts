import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { Tenant } from './tenant.entity';
import { AuthService } from '../../modules/auth/auth.service';
import { ConfigService } from '@nestjs/config';

describe('TenantService', () => {
  let service: TenantService;
  let tenantRepository: Repository<Tenant>;
  let authService: AuthService;

  const mockTenantRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  };

  const mockAuthService = {
    createAdminUser: jest.fn(),
    generateAdminToken: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        {
          provide: getRepositoryToken(Tenant),
          useValue: mockTenantRepository,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<TenantService>(TenantService);
    tenantRepository = module.get<Repository<Tenant>>(getRepositoryToken(Tenant));
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTenant', () => {
    const createTenantDto = {
      tenantId: 'test-tenant',
      name: 'Test Tenant',
      database: {
        host: 'localhost',
        port: 5432,
        username: 'test',
        password: 'test',
      },
    };

    it('should throw ConflictException if tenant already exists', async () => {
      const existingTenant = { id: '1', tenantId: 'test-tenant' };
      mockTenantRepository.findOne.mockResolvedValue(existingTenant);

      await expect(service.createTenant(createTenantDto)).rejects.toThrow(ConflictException);
      expect(mockTenantRepository.findOne).toHaveBeenCalledWith({
        where: { tenantId: 'test-tenant' },
      });
    });
  });

  describe('getAllTenants', () => {
    it('should return list of active tenants', async () => {
      const tenants = [
        { id: '1', tenantId: 'tenant1', active: true },
        { id: '2', tenantId: 'tenant2', active: true },
      ];
      mockTenantRepository.find.mockResolvedValue(tenants);

      const result = await service.getAllTenants();

      expect(result).toEqual(tenants);
      expect(mockTenantRepository.find).toHaveBeenCalledWith({
        where: { active: true },
        order: { createdAt: 'DESC' },
      });
    });
  });
});
