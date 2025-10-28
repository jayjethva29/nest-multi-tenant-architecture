# Multi-Tenant NestJS Backend

Production-ready NestJS multi-tenant backend with database-per-tenant architecture, JWT authentication, and comprehensive tenant management.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                           Client Request                        │
└─────────────────────┬───────────────────────────────────────────┘
                      │
              ┌───────▼────────┐
              │ JWT Guard      │ Extract JWT (sub: userId, tenantId: tenantId)
              └───────┬────────┘
                      │
              ┌───────▼────────┐
              │ Tenant Guard   │ Resolve tenant DataSource
              └───────┬────────┘
                      │
              ┌───────▼────────┐
              │ Request        │ tenantId + tenantDataSource attached
              │ Processing     │
              └───────┬────────┘
                      │
          ┌───────────▼───────────┐
          │ Tenant-Scoped         │ Use tenant-specific database
          │ Operations            │
          └───────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+

### Local Development Setup

1. **Clone and install dependencies:**

```bash
git clone <repository-url>
cd nestjs-multi-tenant-backend
npm install
```

2. **Setup environment:**

```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start infrastructure with Docker:**

```bash
npm run docker:up
```

4. **Run migrations for central database:**

```bash
npm run typeorm -- migration:run -d src/config/typeorm.config.ts
```

5. **Start development server:**

```bash
npm run start:dev
```

The application will be available at:

- API: http://localhost:3000/api/v1
- Swagger Docs: http://localhost:3000/api/docs

## 📁 Project Structure

```
src/
├── common/                 # Shared utilities
│   ├── decorators/        # @Tenant(), @CurrentUser()
│   ├── guards/           # JWT & Tenant guards
│   └── interceptors/     # Request ID, Logging
├── config/               # Configuration files
│   ├── env.schema.ts     # Environment validation
│   └── typeorm.config.ts # Database configurations
├── core/                 # Core business logic
│   ├── connection/       # Tenant connection manager
│   └── tenant/          # Tenant management
├── modules/              # Feature modules
│   ├── auth/            # Authentication
│   ├── products/        # Example CRUD (tenant-scoped)
│   └── users/           # User management (tenant-scoped)
├── migrations/           # Database migrations
│   ├── central/         # Central registry migrations
│   └── tenant/          # Tenant-specific migrations
└── main.ts              # Application entry point
```

## 🔧 Configuration

### Environment Variables

| Variable          | Description                          | Default            |
| ----------------- | ------------------------------------ | ------------------ |
| `NODE_ENV`        | Environment mode                     | `development`      |
| `PORT`            | Application port                     | `3000`             |
| `CENTRAL_DB_HOST` | Central registry DB host             | `localhost`        |
| `CENTRAL_DB_PORT` | Central registry DB port             | `5432`             |
| `CENTRAL_DB_NAME` | Central registry DB name             | `central_registry` |
| `CENTRAL_DB_USER` | Central registry DB user             | `postgres`         |
| `CENTRAL_DB_PASS` | Central registry DB password         | `password`         |
| `JWT_SECRET`      | JWT signing secret                   | `your_jwt_secret`  |
| `JWT_EXPIRES_IN`  | JWT expiration time                  | `3600s`            |
| `ADMIN_DB_HOST`   | Admin DB host (for provisioning)     | `localhost`        |
| `ADMIN_DB_USER`   | Admin DB user (for provisioning)     | `postgres`         |
| `ADMIN_DB_PASS`   | Admin DB password (for provisioning) | `password`         |

## 🏢 Tenant Management

### Creating a Tenant

#### Via API

```bash
curl -X POST http://localhost:3000/api/v1/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "acme-corp",
    "name": "ACME Corporation",
    "database": {
      "host": "localhost",
      "port": 5432,
      "username": "postgres",
      "password": "password"
    },
    "adminUser": {
      "email": "admin@acme.com",
      "password": "secure123",
      "firstName": "Admin",
      "lastName": "User"
    }
  }'
```

#### Via CLI Script

```bash
npm run create:tenant acme-corp "ACME Corporation" admin@acme.com secure123
```

### What Happens During Tenant Creation

1. **Registry Entry**: Creates tenant record in central database
2. **Database Provisioning**: Creates new PostgreSQL database
3. **Schema Setup**: Runs migrations on new tenant database
4. **Admin User**: Creates initial admin user (if provided)
5. **JWT Token**: Returns admin JWT for immediate API access

## 🔐 Authentication

### JWT Structure

```javascript
{
  "sub": "user-uuid",     // User ID
  "tenantId": "tenant-id",     // Tenant ID
  "email": "user@email.com",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Login Example

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "acme-corp",
    "email": "admin@acme.com",
    "password": "secure123"
  }'
```

### Protected Route Usage

```bash
curl -X GET http://localhost:3000/api/v1/products \
  -H "Authorization: Bearer <your-jwt-token>"
```

## 🛡️ Security Features

- **JWT Authentication**: Stateless authentication with tenant isolation
- **Request Rate Limiting**: Configurable throttling per endpoint
- **Input Validation**: Comprehensive DTO validation with class-validator
- **SQL Injection Protection**: TypeORM query parameterization
- **CORS Protection**: Configurable cross-origin resource sharing
- **Password Hashing**: Bcrypt with configurable rounds

## 📊 Example CRUD Operations

### Products API (Tenant-Scoped)

All product operations are automatically scoped to the authenticated user's tenant.

```bash
# Create Product
curl -X POST http://localhost:3000/api/v1/products \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop Pro",
    "description": "High-performance laptop",
    "price": 1299.99,
    "sku": "LAPTOP-PRO-001",
    "category": "Electronics",
    "stockQuantity": 50
  }'

# Get Products (with pagination)
curl "http://localhost:3000/api/v1/products?page=1&limit=10&search=laptop" \
  -H "Authorization: Bearer <token>"

# Update Product
curl -X PATCH http://localhost:3000/api/v1/products/<product-id> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"price": 1199.99}'
```

### User Management API (Tenant-Scoped)

User management operations for creating and managing users within tenants.

```bash
# Create Admin User in Tenant (Public endpoint - no authentication required)
curl -X POST http://localhost:3000/api/v1/tenants/acme-corp/users/admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@acme.com",
    "password": "secure123",
    "firstName": "Admin",
    "lastName": "User"
  }'

# Create Regular User (Requires authentication)
curl -X POST http://localhost:3000/api/v1/tenants/acme-corp/users \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@acme.com",
    "password": "secure123",
    "firstName": "John",
    "lastName": "Doe"
  }'

# Get All Users in Tenant (Requires authentication)
curl -X GET http://localhost:3000/api/v1/tenants/acme-corp/users \
  -H "Authorization: Bearer <token>"
```

> **Note**: The admin user creation endpoint (`POST /tenants/:tenantId/users/admin`) is public and does not require authentication. This allows creating initial admin users for existing tenants. Regular user creation and listing operations require valid JWT authentication.

## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Test Database Setup

For testing, create a separate test database:

```bash
createdb central_registry_test
export NODE_ENV=test
npm run test
```

## 🐳 Docker Deployment

### Development

```bash
# Start all services
docker-compose -f docker/docker-compose.yml up --build

# Stop services
docker-compose -f docker/docker-compose.yml down
```

### Production Build

```bash
# Build production image
docker build -f docker/Dockerfile -t nestjs-multitenant:latest .

# Run with environment variables
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e CENTRAL_DB_HOST=your-db-host \
  -e JWT_SECRET=your-production-secret \
  nestjs-multitenant:latest
```

## 🔧 Database Migrations

### Central Database Migrations

```bash
# Create migration
npm run typeorm -- migration:create src/migrations/central/NewMigration

# Run migrations
npm run typeorm -- migration:run
```

### Tenant Database Migrations

```bash
# Run migrations for specific tenant
npm run migrate:tenant acme-corp

# Create tenant migration
npm run typeorm -- migration:create src/migrations/tenant/NewTenantMigration
```

## 📈 Monitoring & Logging

### Request Tracing

Every request includes:

- **Request ID**: Unique identifier for tracing
- **Tenant ID**: Automatic tenant context
- **User ID**: Authenticated user context

### Log Structure

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "info",
  "message": "Incoming Request: GET /api/v1/products",
  "requestId": "uuid-v4",
  "tenantId": "acme-corp",
  "userId": "user-uuid",
  "method": "GET",
  "url": "/api/v1/products"
}
```

## 🚀 Production Deployment

### Environment Preparation

1. **Secrets Management**: Replace plain-text credentials with secrets manager
2. **Database Setup**: Use managed PostgreSQL (AWS RDS, Google Cloud SQL)
3. **Load Balancing**: Deploy behind load balancer with SSL termination
4. **Monitoring**: Integrate with APM tools (DataDog, New Relic)

### Production Checklist

- [ ] Update `JWT_SECRET` to cryptographically secure value
- [ ] Configure managed database connections
- [ ] Setup SSL/TLS certificates
- [ ] Configure log aggregation
- [ ] Setup health checks and monitoring
- [ ] Configure backup strategies
- [ ] Review security headers and CORS settings

### Managed Database Integration

For production, update tenant creation to use managed database APIs:

```typescript
// Example: AWS RDS integration
private async provisionTenantDatabase(tenant: Tenant): Promise<void> {
  const rds = new AWS.RDS();

  await rds.createDBInstance({
    DBInstanceIdentifier: `tenant-${tenant.tenantId}`,
    DBInstanceClass: 'db.t3.micro',
    Engine: 'postgres',
    MasterUsername: 'postgres',
    MasterUserPassword: generateSecurePassword(),
    AllocatedStorage: 20,
  }).promise();
}
```

## 🔄 CI/CD Pipeline

The project includes GitHub Actions workflow for:

- **Linting**: ESLint + Prettier validation
- **Testing**: Unit and integration tests
- **Security**: Dependency vulnerability scanning
- **Build**: TypeScript compilation and Docker image
- **Deployment**: Automatic deployment on main branch

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push branch: `git push origin feature/new-feature`
5. Create Pull Request

## 📝 API Documentation

Complete API documentation is available at `/api/docs` when running the application.

Key endpoints:

- `POST /api/v1/tenants` - Create new tenant
- `POST /api/v1/auth/login` - User authentication
- `GET /api/v1/products` - List tenant products
- `POST /api/v1/products` - Create tenant product

## 🆘 Troubleshooting

### Common Issues

**Connection Refused Errors**

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check connection settings
npm run typeorm -- query "SELECT 1"
```

**Tenant Not Found Errors**

```bash
# Verify tenant exists
npm run typeorm -- query "SELECT * FROM tenants WHERE tenant_id = 'your-tenant'"

# Check tenant database connectivity
npm run migrate:tenant your-tenant-id
```

**JWT Validation Errors**

- Verify `JWT_SECRET` environment variable
- Check token expiration (`exp` claim)
- Ensure `tenantId` and `sub` claims are present

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Links

- [NestJS Documentation](https://nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [PostgreSQL Documentation](https://postgresql.org/docs/)
- [JWT Specification](https://jwt.io/)

---

Built with ❤️ using NestJS, TypeORM, and PostgreSQL
