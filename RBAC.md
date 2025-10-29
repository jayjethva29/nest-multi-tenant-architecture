# Role-Based Access Control (RBAC) Documentation

## Overview

This multi-tenant NestJS application implements a comprehensive Role-Based Access Control (RBAC) system that provides fine-grained access control for resources across different tenants. The RBAC system is tenant-isolated, meaning each tenant has its own set of users, roles, and permissions.

## Architecture

### Core Components

1. **Entities**: Define the database structure for RBAC
2. **Guards**: Enforce authentication and authorization
3. **Decorators**: Simplify permission checking in controllers
4. **Services**: Manage RBAC operations

### Database Schema

The RBAC system uses the following entities in each tenant database:

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│    User     │    │   UserRole   │    │    Role     │
├─────────────┤    ├──────────────┤    ├─────────────┤
│ id (UUID)   │───▶│ userId       │◀───│ id (UUID)   │
│ email       │    │ roleId       │    │ name        │
│ password    │    │ assignedAt   │    │ description │
│ active      │    └──────────────┘    │ isDefault   │
│ ...         │                        └─────────────┘
└─────────────┘                               │
                                              ▼
                     ┌─────────────┐    ┌──────────────┐
                     │ Permission  │    │RolePermission│
                     ├─────────────┤    ├──────────────┤
                     │ id (UUID)   │◀───│ roleId       │
                     │ name        │    │ permissionId │
                     │ resource    │    └──────────────┘
                     │ action      │
                     │ description │
                     └─────────────┘
```

## Entities

### 1. Permission Entity

Defines granular permissions for specific resources and actions.

```typescript
@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // e.g., "users:create"

  @Column()
  resource: string; // e.g., "users"

  @Column()
  action: string; // e.g., "create"

  @Column({ nullable: true })
  description: string; // Human-readable description

  @ManyToMany('Role', 'permissions')
  roles: Role[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 2. Role Entity

Groups permissions into logical roles.

```typescript
@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // e.g., "admin", "user", "manager"

  @Column({ nullable: true })
  description: string; // Role description

  @Column({ default: false })
  isDefault: boolean; // Auto-assigned to new users

  @ManyToMany('Permission', 'roles')
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'roleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permissionId', referencedColumnName: 'id' },
  })
  permissions: Permission[];

  @OneToMany('UserRole', 'role')
  userRoles: UserRole[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 3. UserRole Entity

Links users to their assigned roles.

```typescript
@Entity('user_roles')
export class UserRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  roleId: string;

  @ManyToOne('User', 'userRoles')
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne('Role', 'userRoles')
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @CreateDateColumn()
  assignedAt: Date;
}
```

## Authentication & Authorization Flow

### 1. Authentication (JWT Strategy)

The JWT strategy validates tokens and ensures users still exist and are active:

```typescript
async validate(payload: JwtPayload): Promise<JwtPayload> {
  // Validate payload structure
  if (!payload.id || !payload.tenantId) {
    throw new UnauthorizedException('Invalid token');
  }

  // Verify user exists and is active
  const userRepository = await this.tenantConnectionManager.getTenantRepository(
    payload.tenantId,
    User,
  );

  const user = await userRepository.findOne({
    where: { id: payload.id, active: true },
  });

  if (!user) {
    throw new UnauthorizedException('User not found or inactive');
  }

  return payload;
}
```

### 2. Authorization (Permissions Guard)

The permissions guard checks if users have required permissions:

```typescript
async canActivate(context: ExecutionContext): Promise<boolean> {
  // Check if route is public
  const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
    context.getHandler(),
    context.getClass(),
  ]);

  if (isPublic) return true;

  // Get required permissions
  const requiredPermissions = this.reflector.getAllAndOverride<RequiredPermission[]>(
    PERMISSIONS_KEY,
    [context.getHandler(), context.getClass()],
  );

  if (!requiredPermissions?.length) return true;

  // Validate user permissions
  const request = context.switchToHttp().getRequest();
  const user = request.user;

  return await this.checkUserPermissions(
    user.tenantId,
    user.id,
    requiredPermissions,
  );
}
```

## Usage Examples

### 1. Controller-Level Permissions

Apply permissions to entire controllers:

```typescript
@Controller('users')
@RequirePermissions({ resource: 'users', action: 'read' })
export class UsersController {
  // All methods require 'users:read' permission
}
```

### 2. Method-Level Permissions

Apply specific permissions to individual methods:

```typescript
@Controller('users')
export class UsersController {
  @Get()
  @RequirePermissions({ resource: 'users', action: 'read' })
  findAll() {
    // Requires 'users:read' permission
  }

  @Post()
  @RequirePermissions({ resource: 'users', action: 'create' })
  create() {
    // Requires 'users:create' permission
  }

  @Delete(':id')
  @RequirePermissions({ resource: 'users', action: 'delete' })
  remove() {
    // Requires 'users:delete' permission
  }
}
```

### 3. Multiple Permissions

Require multiple permissions (user must have ALL):

```typescript
@Post('admin-action')
@RequirePermissions(
  { resource: 'admin', action: 'access' },
  { resource: 'users', action: 'manage' }
)
adminAction() {
  // User must have both 'admin:access' AND 'users:manage'
}
```

### 4. Public Routes

Skip authentication and authorization:

```typescript
@Post('login')
@Public()
login() {
  // No authentication required
}
```

## Permission Management

### 1. Creating Permissions

```typescript
// Example permissions for a typical application
const permissions = [
  { name: 'users:create', resource: 'users', action: 'create' },
  { name: 'users:read', resource: 'users', action: 'read' },
  { name: 'users:update', resource: 'users', action: 'update' },
  { name: 'users:delete', resource: 'users', action: 'delete' },
  { name: 'products:create', resource: 'products', action: 'create' },
  { name: 'products:read', resource: 'products', action: 'read' },
  { name: 'products:update', resource: 'products', action: 'update' },
  { name: 'products:delete', resource: 'products', action: 'delete' },
  { name: 'admin:access', resource: 'admin', action: 'access' },
];
```

### 2. Creating Roles

```typescript
// Example role definitions
const roles = [
  {
    name: 'admin',
    description: 'Full system access',
    isDefault: false,
    permissions: ['users:*', 'products:*', 'admin:access'],
  },
  {
    name: 'user',
    description: 'Basic user access',
    isDefault: true,
    permissions: ['users:read', 'products:read'],
  },
  {
    name: 'manager',
    description: 'Product management access',
    isDefault: false,
    permissions: ['users:read', 'products:*'],
  },
];
```

### 3. Assigning Roles to Users

```typescript
// Via PermissionsService
await this.permissionsService.assignRoleToUser(tenantId, userId, roleId);

// Multiple roles
await this.permissionsService.assignRolesToUser(tenantId, userId, [roleId1, roleId2]);
```

## API Endpoints

### Permissions Management

```typescript
// Get all permissions
GET /permissions

// Create permission
POST /permissions
{
  "name": "users:create",
  "resource": "users",
  "action": "create",
  "description": "Create new users"
}

// Update permission
PUT /permissions/:id
{
  "description": "Updated description"
}

// Delete permission
DELETE /permissions/:id
```

### Role Management

```typescript
// Get all roles
GET /roles

// Create role
POST /roles
{
  "name": "editor",
  "description": "Content editor role",
  "isDefault": false,
  "permissionIds": ["uuid1", "uuid2", "uuid3"]
}

// Update role
PUT /roles/:id
{
  "description": "Updated description",
  "permissionIds": ["uuid1", "uuid4"]
}

// Delete role
DELETE /roles/:id

// Assign role to user
POST /roles/:roleId/users/:userId

// Remove role from user
DELETE /roles/:roleId/users/:userId
```

## Security Features

### 1. Token Validation

- **User Existence Check**: Every request validates that the user still exists in the database
- **Active Status Check**: Only active users can access protected resources
- **Email Consistency**: Validates token email matches current user email
- **Tenant Isolation**: Users can only access resources within their tenant

### 2. Permission Caching

To improve performance, consider implementing permission caching:

```typescript
// Example caching strategy (not implemented in current version)
private async getCachedUserPermissions(userId: string, tenantId: string) {
  const cacheKey = `permissions:${tenantId}:${userId}`;
  let permissions = await this.cacheManager.get(cacheKey);

  if (!permissions) {
    permissions = await this.loadUserPermissions(userId, tenantId);
    await this.cacheManager.set(cacheKey, permissions, 300); // 5 minutes
  }

  return permissions;
}
```

### 3. Audit Logging

Track permission changes and access attempts:

```typescript
// Log permission checks (already implemented in guards)
console.log('PermissionsGuard: Checking permissions for user', userId);
console.log('Required permissions:', requiredPermissions);
console.log('User permissions:', Array.from(userPermissions));
```

## Best Practices

### 1. Permission Naming

Use a consistent naming convention:

- **Format**: `resource:action`
- **Examples**: `users:create`, `products:read`, `admin:access`
- **Wildcards**: Use `*` for all actions: `users:*`

### 2. Role Design

- **Principle of Least Privilege**: Give users minimum permissions needed
- **Role Hierarchy**: Design roles from least to most privileged
- **Default Roles**: Always have a default role for new users

### 3. Security Considerations

- **Regular Token Validation**: Always validate user existence on each request
- **Graceful Degradation**: Handle database errors appropriately
- **Audit Trail**: Log permission assignments and access attempts
- **Tenant Isolation**: Ensure cross-tenant data access is impossible

### 4. Performance Optimization

- **Eager Loading**: Load user roles and permissions efficiently
- **Caching**: Cache permission checks for frequently accessed resources
- **Database Indexing**: Index user roles and permissions tables

## Migration Scripts

The system includes initialization scripts for setting up default permissions and roles:

### 1. Initialize Permissions

```bash
npm run script scripts/initialize-permissions.ts
```

### 2. Initialize Tenant Permissions

```bash
npm run script scripts/initialize-tenant-permissions.ts <tenant-id>
```

## Troubleshooting

### Common Issues

1. **"Insufficient permissions" Error**

   - Check user roles: `SELECT * FROM user_roles WHERE userId = ?`
   - Verify role permissions: `SELECT * FROM role_permissions WHERE roleId = ?`
   - Ensure permissions exist: `SELECT * FROM permissions WHERE resource = ? AND action = ?`

2. **"User not found or inactive" Error**

   - Check user status: `SELECT active FROM users WHERE id = ?`
   - Verify user exists in correct tenant database

3. **Permission Decorator Not Working**
   - Ensure guards are properly configured in module
   - Check decorator syntax and imports
   - Verify route is not marked as `@Public()`

### Debug Logging

Enable debug logging to trace permission checks:

```typescript
// In guards and services
console.log('Permission check:', {
  userId,
  tenantId,
  requiredPermissions,
  userPermissions: Array.from(userPermissions),
});
```

## Conclusion

This RBAC implementation provides a robust, secure, and scalable authorization system for the multi-tenant NestJS application. It ensures proper tenant isolation while providing fine-grained access control through a combination of roles and permissions.

The system is designed to be:

- **Secure**: Validates user existence on every request
- **Flexible**: Supports complex permission scenarios
- **Maintainable**: Clear separation of concerns
- **Scalable**: Tenant-isolated for multi-tenancy
- **Performance-focused**: Efficient database queries and caching support
