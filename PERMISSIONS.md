# Permission-Based Authorization System

## Overview

This multi-tenant NestJS application now includes a comprehensive Role-Based Access Control (RBAC) system with the following features:

- **Role-based permissions**: Users → Roles → Permissions
- **Resource-level permissions**: Format like "users:read", "products:write"
- **Tenant-specific**: Each tenant has its own roles/permissions
- **Super-admin support**: Can access multiple tenants
- **Scope**: Users and Products resources
- **Database**: Permission tables in each tenant database

## Architecture

### Entities

#### Permission

- `id` (UUID): Primary key
- `name` (string): Unique permission name (e.g., "users:read")
- `resource` (string): Resource type (e.g., "users", "products", "roles")
- `action` (string): Action type (e.g., "create", "read", "update", "delete")
- `description` (string): Human-readable description

#### Role

- `id` (UUID): Primary key
- `name` (string): Unique role name (e.g., "admin", "manager", "user")
- `description` (string): Role description
- `isDefault` (boolean): Whether this role is assigned to new users by default
- `permissions[]`: Array of permissions associated with this role

#### UserRole

- `id` (UUID): Primary key
- `userId` (UUID): Reference to user
- `roleId` (UUID): Reference to role
- Junction table for many-to-many relationship between users and roles

### Default Roles

The system creates these default roles for each tenant:

1. **Admin**: Full access to all resources and actions
2. **Manager**: Can manage users and products, but cannot manage roles (except read)
3. **User**: Read-only access to products and users (default role)
4. **Viewer**: Read-only access to all resources

### Default Permissions

The system creates these default permissions:

**User Management:**

- `users:create` - Create new users
- `users:read` - View users
- `users:update` - Update users
- `users:delete` - Delete users

**Product Management:**

- `products:create` - Create new products
- `products:read` - View products
- `products:update` - Update products
- `products:delete` - Delete products

**Role Management:**

- `roles:create` - Create new roles
- `roles:read` - View roles
- `roles:update` - Update roles
- `roles:delete` - Delete roles
- `roles:assign` - Assign roles to users

## API Endpoints

### Authentication

- `POST /auth/login` - User login (Public)

### Users

- `GET /users` - List all users (Requires: `users:read`)
- `POST /users` - Create user (Requires: `users:create`)
- `POST /users/:tenantId/admin` - Create admin user (Public - for development)

### Products

- `GET /products` - List products (Requires: `products:read`)
- `POST /products` - Create product (Requires: `products:create`)
- `GET /products/:id` - Get product by ID (Requires: `products:read`)
- `GET /products/sku/:sku` - Get product by SKU (Requires: `products:read`)
- `PATCH /products/:id` - Update product (Requires: `products:update`)
- `DELETE /products/:id` - Delete product (Requires: `products:delete`)

### Permissions Management

- `POST /permissions/permissions` - Create permission (Requires: `roles:create`)
- `GET /permissions/permissions` - List permissions (Requires: `roles:read`)
- `GET /permissions/permissions/:id` - Get permission by ID (Requires: `roles:read`)
- `DELETE /permissions/permissions/:id` - Delete permission (Requires: `roles:delete`)

### Role Management

- `POST /permissions/roles` - Create role (Requires: `roles:create`)
- `GET /permissions/roles` - List roles (Requires: `roles:read`)
- `GET /permissions/roles/:id` - Get role by ID (Requires: `roles:read`)
- `PUT /permissions/roles/:id` - Update role (Requires: `roles:update`)
- `DELETE /permissions/roles/:id` - Delete role (Requires: `roles:delete`)

### User Role Assignment

- `POST /permissions/roles/assign` - Assign role to user (Requires: `roles:assign`)
- `DELETE /permissions/roles/:roleId/users/:userId` - Remove role from user (Requires: `roles:assign`)
- `GET /permissions/users/:userId/roles` - Get user's roles (Requires: `roles:read`)
- `GET /permissions/users/:userId/permissions` - Get user's permissions (Requires: `roles:read`)
- `GET /permissions/roles/:roleId/users` - Get users with specific role (Requires: `roles:read`)

### System Management

- `POST /permissions/initialize` - Initialize default permissions and roles (Requires: `roles:create`)

## Usage Examples

### 1. Creating a New Tenant with Admin User

```bash
npm run create:tenant "My Company" admin@company.com password123
```

This will:

- Create a new tenant
- Run database migrations
- Initialize default permissions and roles
- Create an admin user
- Assign admin role to the user
- Return an admin token for API access

### 2. Login and Get Access Token

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: your-tenant-id" \
  -d '{
    "email": "admin@company.com",
    "password": "password123"
  }'
```

### 3. Create a New Role

```bash
curl -X POST http://localhost:3000/permissions/roles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Tenant-ID: your-tenant-id" \
  -d '{
    "name": "editor",
    "description": "Can edit products but not manage users",
    "permissionIds": ["permission-id-1", "permission-id-2"]
  }'
```

### 4. Assign Role to User

```bash
curl -X POST http://localhost:3000/permissions/roles/assign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Tenant-ID: your-tenant-id" \
  -d '{
    "userId": "user-id",
    "roleId": "role-id"
  }'
```

### 5. Check User Permissions

```bash
curl -X GET http://localhost:3000/permissions/users/USER_ID/permissions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Tenant-ID: your-tenant-id"
```

## Implementation Details

### Guards and Decorators

The system uses two main decorators to control access:

#### @Public()

Marks an endpoint as publicly accessible (bypasses authentication and authorization):

```typescript
@Post('login')
@Public()
async login(@Body() loginDto: LoginDto) {
  // Public endpoint
}
```

#### @RequirePermissions()

Specifies required permissions for an endpoint:

```typescript
@Get()
@RequirePermissions({ resource: 'users', action: 'read' })
async getAllUsers() {
  // Requires 'users:read' permission
}

@Post()
@RequirePermissions(
  { resource: 'products', action: 'create' },
  { resource: 'users', action: 'read' }
)
async createProduct() {
  // Requires both 'products:create' AND 'users:read' permissions
}
```

### Guards Chain

The application uses a chain of guards:

1. **JwtAuthGuard**: Validates JWT token and populates `user` in request
2. **PermissionsGuard**: Checks if user has required permissions

### Automatic Role Assignment

- New users automatically get the default role (marked with `isDefault: true`)
- Admin users created during tenant setup get the admin role
- The system prevents duplicate role assignments

### Permission Checking Logic

The `PermissionsGuard` performs the following steps:

1. Check if the endpoint is marked as `@Public()` - if yes, allow access
2. Get required permissions from `@RequirePermissions()` decorator
3. If no specific permissions required, allow access
4. Fetch user's roles and their associated permissions
5. Check if user has ALL required permissions
6. Allow or deny access based on permission check

### Database Schema

Each tenant database contains these permission-related tables:

- `permissions` - Stores all available permissions
- `roles` - Stores roles with metadata
- `role_permissions` - Junction table for role-permission many-to-many
- `user_roles` - Junction table for user-role many-to-many

### Migration and Initialization

When a new tenant is created:

1. Database is provisioned
2. Migrations are run to create all tables
3. Default permissions are seeded
4. Default roles are created with appropriate permissions
5. Admin user (if provided) gets admin role assigned

## Development and Testing

### Run the Application

```bash
npm run start:dev
```

### Create a Test Tenant

```bash
npm run create:tenant "Test Company" test@test.com test123
```

### Test API Endpoints

Use the provided admin token or login to get a user token, then test the various endpoints with different permission levels.

### Check Errors

The system provides detailed error messages for:

- Missing authentication
- Insufficient permissions
- Invalid role/permission assignments
- Circular role dependencies

## Security Considerations

1. **Principle of Least Privilege**: Users get minimal permissions by default
2. **Tenant Isolation**: Permissions are completely isolated per tenant
3. **No Permission Inheritance**: Permissions must be explicitly granted
4. **Audit Trail**: All permission changes are logged
5. **Token Validation**: All endpoints (except public) require valid JWT tokens
6. **Role Validation**: Cannot delete roles that are assigned to users

## Troubleshooting

### Common Issues

1. **"Insufficient permissions"**: User doesn't have required permission for the endpoint
2. **"User not authenticated"**: Missing or invalid JWT token
3. **"Role already assigned"**: Trying to assign a role that user already has
4. **"Cannot delete role"**: Trying to delete a role that's assigned to users

### Debug Tips

1. Check user's permissions: `GET /permissions/users/:userId/permissions`
2. Check user's roles: `GET /permissions/users/:userId/roles`
3. Verify token validity and tenant ID in headers
4. Check application logs for detailed error messages

## Future Enhancements

Potential areas for expansion:

1. **Permission Inheritance**: Hierarchical roles with inheritance
2. **Resource-specific Permissions**: Permissions tied to specific resource instances
3. **Time-based Permissions**: Temporary role assignments
4. **Permission Audit Log**: Track all permission changes
5. **API Rate Limiting**: Per-role rate limiting
6. **Advanced RBAC**: Attribute-based access control (ABAC)
