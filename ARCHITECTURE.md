# Multi-Tenant NestJS Backend - Architecture Diagram

## 🏗️ High-Level Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                   │
├─────────────────┬─────────────────┬─────────────────────────────────────────┤
│  Web Application │   Mobile App    │           API Client                    │
└─────────────────┴─────────────────┴─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Load Balancer/Reverse Proxy                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NESTJS APPLICATION LAYER                          │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        MIDDLEWARE STACK                            │    │
│  │  CORS → Security Headers → Rate Limiting → Request ID → Logging   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                  AUTHENTICATION & AUTHORIZATION                    │    │
  │           JWT Guard → JWT Strategy (extracts tenantId)                    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         CORE MODULES                               │    │
│  │          Tenant Connection Manager → Tenant Service
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    BUSINESS LOGIC MODULES                          │    │
│  │      Auth Module    │    Users Module    │    Products Module      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         CONTROLLERS                                │    │
│  │  Tenant Ctrl │ Auth Ctrl │ Users Ctrl │ Products Ctrl             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE LAYER                                 │
│                                                                             │
│  ┌─────────────────────────┐           ┌─────────────────────────────────┐   │
│  │    CENTRAL REGISTRY     │           │        TENANT DATABASES        │   │
│  │                         │           │                                 │   │
│  │  ┌─────────────────┐    │           │  ┌─────────┬─────────┬───────┐  │   │
│  │  │ Central PostgreSQL│   │           │  │Tenant 1 │Tenant 2 │Tenant │  │   │
│  │  └─────────────────┘    │           │  │   DB    │   DB    │  N DB │  │   │
│  │  ┌─────────────────┐    │           │  └─────────┴─────────┴───────┘  │   │
│  │  │  Tenants Table  │    │           │                                 │   │
│  │  └─────────────────┘    │           │                                 │   │
│  └─────────────────────────┘           └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SERVICES                                 │
│      Redis Cache      │   Log Aggregation   │   Metrics & Monitoring      │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🔄 Request Flow Architecture

```
Detailed Flow:
1. Client              ──→ HTTP Request with JWT
2. NestJS API         ──→ Validate JWT Token
3. JWT Guard          ──→ Extract user & tenantId
4. JWT Strategy       ──→ Validate payload and provide user context
5. Controller         ──→ Access tenantId from @CurrentUser()
6. Service           ──→ Use tenantId for DB operations
7. Tenant Conn Mgr   ──→ Get/create tenant connection
8. Tenant DB         ──→ Execute tenant-scoped queries
9. Service           ──→ Process data
10. Controller       ──→ HTTP Response to Client
```

## 🏢 Multi-Tenant Architecture Patterns

### 1. Database-Per-Tenant Pattern

```

Central Registry DB
├── tenants table

Tenant A Database
├── users table
├── products table
└── other business entities

Tenant B Database
├── users table
├── products table
└── other business entities

```

### 2.🗄️ Database Architecture

#### Central Registry Database

```

TENANTS Table
├── id (UUID, Primary Key)
├── name (String)
├── db_host (String)
├── db_port (Integer)
├── db_name (String)
├── db_user (String)
├── db_password (String)
├── pool_options (JSONB)
├── active (Boolean)
├── created_at (Timestamp)
└── updated_at (Timestamp)

```

#### Tenant Database Schema (Replicated per tenant)

```

USERS Table PRODUCTS Table
├── id (UUID, Primary Key) ├── id (UUID, Primary Key)
├── email (String, Unique) ├── name (String)
├── password (String) ├── description (String)
├── first_name (String) ├── price (Decimal)
├── last_name (String) ├── stock_quantity (Integer)
├── active (Boolean) ├── active (Boolean)
├── created_at (Timestamp) ├── created_at (Timestamp)
└── updated_at (Timestamp) └── updated_at (Timestamp)

```

## 🔧 Component Breakdown

### Core Components

| Component                     | Purpose                                 | Key Features                                                      |
| ----------------------------- | --------------------------------------- | ----------------------------------------------------------------- |
| **Tenant Connection Manager** | Manages database connections per tenant | Connection pooling, thread-safe initialization, automatic cleanup |
| **JWT Guard/Strategy**        | Validates authentication tokens         | Token validation, user+tenant extraction, security                |
| **Auth Service**              | Handles authentication logic            | Login/logout, token generation, user validation                   |
| **Tenant Service**            | Manages tenant lifecycle                | Creation, configuration, database setup                           |

### Data Flow Components

| Layer              | Components                    | Responsibilities                                                   |
| ------------------ | ----------------------------- | ------------------------------------------------------------------ |
| **Presentation**   | Controllers, DTOs, Validation | Request handling, response formatting, input validation            |
| **Business Logic** | Services, Domain Logic        | Business rules, data transformation, orchestration                 |
| **Data Access**    | Repositories, Entities        | Data persistence, query optimization, transaction management       |
| **Infrastructure** | Connection Manager, Config    | Database connections, environment configuration, external services |

### Scalability Patterns

1. **Horizontal Scaling**: Multiple NestJS instances
2. **Database Sharding**: Tenant databases across different clusters
3. **Caching Strategy**: Redis for session management and frequent queries
4. **Connection Optimization**: Lazy loading and connection reuse
5. **Resource Isolation**: Tenant-specific resource limits

## 🔄 Connection Sharing & Pooling Architecture

### DataSource vs Database Connection Model

```
┌─────────────────────────────────────────────────────────────────┐
│                        TENANT A                                 │
│                                                                 │
│  Request 1 ──┐                                                 │
│  Request 2 ──┼──→ DataSource A ──→ Connection Pool (5 conns)   │
│  Request 3 ──┘         ↑                ├── Connection 1       │
│                         │                ├── Connection 2       │
│                    (Shared)              ├── Connection 3       │
│                                         ├── Connection 4       │
│                                         └── Connection 5       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        TENANT B                                 │
│                                                                 │
│  Request 1 ──┐                                                 │
│  Request 2 ──┼──→ DataSource B ──→ Connection Pool (5 conns)   │
│  Request 4 ──┘         ↑                ├── Connection 1       │
│                         │                ├── Connection 2       │
│                    (Shared)              ├── Connection 3       │
│                                         ├── Connection 4       │
│                                         └── Connection 5       │
└─────────────────────────────────────────────────────────────────┘
```

### Connection Management Strategy

**Single DataSource per Tenant**: All requests for the same tenant share one `DataSource` instance, but **NOT** a single database connection.

```typescript
// Tenant Connection Manager stores one DataSource per tenant
private readonly tenantConnections = new Map<string, DataSource>();
//                                        ↑           ↑
//                                   tenant ID    ONE DataSource per tenant
```

### Connection Pool Configuration

Each DataSource contains a connection pool configured in `typeorm.config.ts`:

```typescript
export const createTenantDataSource = (dbConfig: {
  // ... config
}): DataSource => {
  return new DataSource({
    // ... other config
    poolSize: dbConfig.poolOptions?.max || 5, // ← Pool of 5 connections
    extra: {
      connectionLimit: dbConfig.poolOptions?.max || 5,
      acquireTimeout: dbConfig.poolOptions?.acquireTimeout || 60000,
      timeout: dbConfig.poolOptions?.timeout || 60000,
      idleTimeoutMillis: dbConfig.poolOptions?.idleTimeoutMillis || 30000,
    },
  });
};
```

### Thread-Safe Connection Initialization

The `initializationPromises` Map prevents race conditions:

```
Time: 0ms - 3 concurrent requests for same tenant arrive:
├── Request A: getDataSourceForTenant("tenant-123")
├── Request B: getDataSourceForTenant("tenant-123")
└── Request C: getDataSourceForTenant("tenant-123")

Without initializationPromises (BAD):
├── Request A: Creates connection 1 ❌
├── Request B: Creates connection 2 ❌ (Waste!)
└── Request C: Creates connection 3 ❌ (Waste!)

With initializationPromises (GOOD):
├── Request A: Starts initialization, stores Promise
├── Request B: Finds existing Promise, waits ✅
└── Request C: Finds existing Promise, waits ✅
Result: Only 1 DataSource created per tenant!
```

### Connection Lifecycle Flow

```
Request arrives
      ↓
Gets shared DataSource for tenant (cached)
      ↓
DataSource.getRepository()
      ↓
TypeORM acquires connection from pool
      ↓
Execute SQL query on tenant database
      ↓
Connection returns to pool (for reuse)
      ↓
Response sent to client
```

### Resource Allocation Summary

| Resource                 | Scope       | Sharing Model                              |
| ------------------------ | ----------- | ------------------------------------------ |
| **DataSource**           | Per Tenant  | Shared across all requests for same tenant |
| **Connection Pool**      | Per Tenant  | 5 connections by default (configurable)    |
| **Database Connections** | Per Request | Acquired from pool, returned after use     |
| **Database**             | Per Tenant  | Completely isolated per tenant             |

### Performance Benefits

1. **Resource Efficiency**: One connection pool per tenant (not per request)
2. **Scalability**: Pool handles concurrent requests efficiently
3. **Isolation**: Each tenant has completely separate database and connections
4. **Performance**: Connection reuse avoids connection establishment overhead
5. **Thread Safety**: Race condition prevention with Promise-based initialization
6. **Memory Management**: Automatic cleanup and connection pool management

This architecture provides both **efficiency** (shared DataSource) and **concurrency** (multiple connections) while maintaining strict **tenant isolation**.
