import { DataSource } from 'typeorm';
import { Permission, Role } from '../src/modules/permissions/entities';

export async function initializeTenantPermissions(tenantDataSource: DataSource): Promise<void> {
  const permissionRepository = tenantDataSource.getRepository(Permission);
  const roleRepository = tenantDataSource.getRepository(Role);

  console.log('Initializing default permissions and roles...');

  // Default permissions
  const defaultPermissions = [
    // User permissions
    { name: 'users:create', resource: 'users', action: 'create', description: 'Create new users' },
    { name: 'users:read', resource: 'users', action: 'read', description: 'View users' },
    { name: 'users:update', resource: 'users', action: 'update', description: 'Update users' },
    { name: 'users:delete', resource: 'users', action: 'delete', description: 'Delete users' },

    // Product permissions
    {
      name: 'products:create',
      resource: 'products',
      action: 'create',
      description: 'Create new products',
    },
    { name: 'products:read', resource: 'products', action: 'read', description: 'View products' },
    {
      name: 'products:update',
      resource: 'products',
      action: 'update',
      description: 'Update products',
    },
    {
      name: 'products:delete',
      resource: 'products',
      action: 'delete',
      description: 'Delete products',
    },

    // Role permissions
    { name: 'roles:create', resource: 'roles', action: 'create', description: 'Create new roles' },
    { name: 'roles:read', resource: 'roles', action: 'read', description: 'View roles' },
    { name: 'roles:update', resource: 'roles', action: 'update', description: 'Update roles' },
    { name: 'roles:delete', resource: 'roles', action: 'delete', description: 'Delete roles' },
    {
      name: 'roles:assign',
      resource: 'roles',
      action: 'assign',
      description: 'Assign roles to users',
    },
  ];

  // Create permissions
  const permissions = new Map<string, Permission>();
  for (const permData of defaultPermissions) {
    let permission = await permissionRepository.findOne({
      where: { name: permData.name },
    });

    if (!permission) {
      permission = permissionRepository.create(permData);
      permission = await permissionRepository.save(permission);
      console.log(`Created permission: ${permission.name}`);
    }

    permissions.set(permission.name, permission);
  }

  // Create default roles
  const allPermissions = Array.from(permissions.values());

  // Admin role - all permissions
  let adminRole = await roleRepository.findOne({
    where: { name: 'admin' },
    relations: ['permissions'],
  });

  if (!adminRole) {
    adminRole = roleRepository.create({
      name: 'admin',
      description: 'Administrator with full access',
      isDefault: false,
      permissions: allPermissions,
    });
    await roleRepository.save(adminRole);
    console.log('Created admin role with all permissions');
  }

  // Manager role - moderate permissions (all except role management)
  let managerRole = await roleRepository.findOne({
    where: { name: 'manager' },
    relations: ['permissions'],
  });

  if (!managerRole) {
    const managerPermissions = allPermissions.filter(
      (p) => p.resource !== 'roles' || p.action === 'read',
    );

    managerRole = roleRepository.create({
      name: 'manager',
      description: 'Manager with product and user management',
      isDefault: false,
      permissions: managerPermissions,
    });
    await roleRepository.save(managerRole);
    console.log('Created manager role with selected permissions');
  }

  // User role - basic read permissions
  let userRole = await roleRepository.findOne({
    where: { name: 'user' },
    relations: ['permissions'],
  });

  if (!userRole) {
    const userPermissions = allPermissions.filter(
      (p) =>
        (p.resource === 'products' && p.action === 'read') ||
        (p.resource === 'users' && p.action === 'read'),
    );

    userRole = roleRepository.create({
      name: 'user',
      description: 'Basic user with read-only access',
      isDefault: true,
      permissions: userPermissions,
    });
    await roleRepository.save(userRole);
    console.log('Created user role with read permissions');
  }

  // Viewer role - read-only permissions
  let viewerRole = await roleRepository.findOne({
    where: { name: 'viewer' },
    relations: ['permissions'],
  });

  if (!viewerRole) {
    const viewerPermissions = allPermissions.filter((p) => p.action === 'read');

    viewerRole = roleRepository.create({
      name: 'viewer',
      description: 'Read-only access to all resources',
      isDefault: false,
      permissions: viewerPermissions,
    });
    await roleRepository.save(viewerRole);
    console.log('Created viewer role with read-only permissions');
  }

  console.log('Default permissions and roles initialization completed');
}

// Function to assign default role to a user
export async function assignDefaultRoleToUser(
  tenantDataSource: DataSource,
  userId: string,
): Promise<void> {
  const roleRepository = tenantDataSource.getRepository(Role);
  const { UserRole } = await import('../src/modules/permissions/entities');
  const userRoleRepository = tenantDataSource.getRepository(UserRole);

  // Find default role
  const defaultRole = await roleRepository.findOne({
    where: { isDefault: true },
  });

  if (!defaultRole) {
    console.log('No default role found, skipping role assignment');
    return;
  }

  // Check if user already has this role
  const existingUserRole = await userRoleRepository.findOne({
    where: { userId, roleId: defaultRole.id },
  });

  if (!existingUserRole) {
    const userRole = userRoleRepository.create({
      userId,
      roleId: defaultRole.id,
    });
    await userRoleRepository.save(userRole);
    console.log(`Assigned default role "${defaultRole.name}" to user ${userId}`);
  }
}
