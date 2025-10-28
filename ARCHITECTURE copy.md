# Multi-Tenant NestJS Backend - Architecture Diagram

## 🏗️ High-Level Architecture Overview

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Application]
        MOBILE[Mobile App]
        API_CLIENT[API Client]
    end

    subgraph "API Gateway & Load Balancer"
        LB[Load Balancer/Reverse Proxy]
    end

    subgraph "NestJS Application Layer"
        subgraph "Middleware Stack"
            CORS[CORS]
            HELMET[Security Headers]
            THROTTLE[Rate Limiting]
            REQ_ID[Request ID Generator]
            LOGGING[Request Logging]
        end

        subgraph "Authentication & Authorization"
            JWT_GUARD[JWT Guard]
            TENANT_GUARD[Tenant Guard]
            JWT_STRATEGY[JWT Strategy]
        end

        subgraph "Core Modules"
            TENANT_MGR[Tenant Connection Manager]
            TENANT_SVC[Tenant Service]
            CONFIG[Configuration Service]
        end

        subgraph "Business Logic Modules"
            AUTH_MODULE[Auth Module]
            USER_MODULE[Users Module]
            PRODUCT_MODULE[Products Module]
        end

        subgraph "Controllers"
            TENANT_CTRL[Tenant Controller]
            AUTH_CTRL[Auth Controller]
            USER_CTRL[Users Controller]
            PRODUCT_CTRL[Products Controller]
        end
    end

    subgraph "Database Layer"
        subgraph "Central Registry"
            CENTRAL_DB[(Central PostgreSQL)]
            TENANT_TABLE[Tenants Table]
        end

        subgraph "Tenant Databases"
            TENANT_DB1[(Tenant 1 DB)]
            TENANT_DB2[(Tenant 2 DB)]
            TENANT_DBN[(Tenant N DB)]
        end
    end

    subgraph "External Services"
        CACHE[Redis Cache]
        LOGS[Log Aggregation]
        METRICS[Metrics & Monitoring]
    end

    %% Client connections
    WEB --> LB
    MOBILE --> LB
    API_CLIENT --> LB

    %% Load balancer to middleware
    LB --> CORS

    %% Middleware chain
    CORS --> HELMET
    HELMET --> THROTTLE
    THROTTLE --> REQ_ID
    REQ_ID --> LOGGING

    %% Authentication flow
    LOGGING --> JWT_GUARD
    JWT_GUARD --> JWT_STRATEGY
    JWT_STRATEGY --> TENANT_GUARD

    %% Core services
    TENANT_GUARD --> TENANT_MGR
    TENANT_MGR --> CONFIG

    %% Business logic flow
    TENANT_GUARD --> TENANT_CTRL
    TENANT_GUARD --> AUTH_CTRL
    TENANT_GUARD --> USER_CTRL
    TENANT_GUARD --> PRODUCT_CTRL

    %% Module dependencies
    AUTH_CTRL --> AUTH_MODULE
    USER_CTRL --> USER_MODULE
    PRODUCT_CTRL --> PRODUCT_MODULE
    TENANT_CTRL --> TENANT_SVC

    %% Database connections
    TENANT_SVC --> CENTRAL_DB
    CENTRAL_DB --> TENANT_TABLE

    TENANT_MGR --> TENANT_DB1
    TENANT_MGR --> TENANT_DB2
    TENANT_MGR --> TENANT_DBN

    %% External services
    AUTH_MODULE --> CACHE
    LOGGING --> LOGS
    THROTTLE --> METRICS
```

## 🔄 Request Flow Architecture

```mermaid
sequenceDiagram
    participant Client
    participant API as NestJS API
    participant JWT as JWT Guard
    participant TG as Tenant Guard
    participant TCM as Tenant Connection Manager
    participant Central as Central DB
    participant Tenant as Tenant DB
    participant Controller
    participant Service

    Client->>API: HTTP Request with JWT
    API->>JWT: Validate JWT Token
    JWT->>JWT: Extract user & tenantId
    JWT->>TG: Pass validated user
    TG->>TCM: Get tenant connection
    TCM->>Central: Lookup tenant config
    Central-->>TCM: Return tenant DB config
    TCM->>Tenant: Create/get connection
    Tenant-->>TCM: Return DataSource
    TCM-->>TG: Return tenant connection
    TG->>Controller: Attach tenant context
    Controller->>Service: Business logic with tenant context
    Service->>Tenant: Execute tenant-scoped queries
    Tenant-->>Service: Return data
    Service-->>Controller: Return result
    Controller-->>Client: HTTP Response
```

## 🗄️ Database Architecture

```mermaid
erDiagram
    %% Central Registry Database
    TENANTS {
        uuid id PK
        string name
        string db_host
        integer db_port
        string db_name
        string db_user
        string db_password
        jsonb pool_options
        boolean active
        timestamp created_at
        timestamp updated_at
    }

    %% Tenant Database Schema (replicated per tenant)
    USERS {
        uuid id PK
        string email UK
        string password
        string first_name
        string last_name
        boolean active
        timestamp created_at
        timestamp updated_at
    }

    PRODUCTS {
        uuid id PK
        string name
        string description
        decimal price
        integer stock_quantity
        boolean active
        timestamp created_at
        timestamp updated_at
    }

    %% Relationships within tenant databases
    USERS ||--o{ PRODUCTS : "can manage"
```

## 🏢 Multi-Tenant Architecture Patterns

### 1. Database-Per-Tenant Pattern

```
Central Registry DB
├── tenants table
└── tenant configurations

Tenant A Database
├── users table
├── products table
└── other business entities

Tenant B Database
├── users table
├── products table
└── other business entities
```

### 2. Connection Management

```mermaid
graph LR
    subgraph "Connection Pool Manager"
        TCM[Tenant Connection Manager]
        CACHE[Connection Cache]
        POOL[Connection Pools]
    end

    subgraph "Central Registry"
        CENTRAL[(Central DB)]
    end

    subgraph "Tenant Databases"
        T1[(Tenant 1)]
        T2[(Tenant 2)]
        TN[(Tenant N)]
    end

    TCM --> CACHE
    TCM --> POOL
    TCM --> CENTRAL

    POOL --> T1
    POOL --> T2
    POOL --> TN
```

## 🔐 Security Architecture

```mermaid
graph TB
    subgraph "Security Layers"
        subgraph "Network Security"
            HTTPS[HTTPS/TLS]
            CORS_SEC[CORS Policy]
            HELMET_SEC[Security Headers]
        end

        subgraph "Application Security"
            THROTTLE_SEC[Rate Limiting]
            JWT_SEC[JWT Authentication]
            RBAC[Role-Based Access]
        end

        subgraph "Data Security"
            ENCRYPT[Data Encryption]
            HASH[Password Hashing]
            TENANT_ISO[Tenant Isolation]
        end

        subgraph "Infrastructure Security"
            ENV[Environment Variables]
            SECRETS[Secret Management]
            DB_CREDS[Database Credentials]
        end
    end

    HTTPS --> CORS_SEC
    CORS_SEC --> HELMET_SEC
    HELMET_SEC --> THROTTLE_SEC
    THROTTLE_SEC --> JWT_SEC
    JWT_SEC --> RBAC
    RBAC --> TENANT_ISO
    TENANT_ISO --> ENCRYPT
    ENCRYPT --> HASH

    ENV --> SECRETS
    SECRETS --> DB_CREDS
```

## 🏗️ Module Architecture

```mermaid
graph TB
    subgraph "App Module"
        CONFIG_MOD[Config Module]
        THROTTLE_MOD[Throttler Module]
        TYPEORM_MOD[TypeORM Module]
    end

    subgraph "Core Modules"
        TENANT_MOD[Tenant Module]
        CONNECTION_MOD[Connection Module]
    end

    subgraph "Feature Modules"
        AUTH_MOD[Auth Module]
        USER_MOD[Users Module]
        PRODUCT_MOD[Products Module]
    end

    subgraph "Common"
        GUARDS[Guards]
        DECORATORS[Decorators]
        INTERCEPTORS[Interceptors]
    end

    %% Dependencies
    TENANT_MOD --> CONNECTION_MOD
    AUTH_MOD --> CONNECTION_MOD
    USER_MOD --> CONNECTION_MOD
    PRODUCT_MOD --> CONNECTION_MOD

    AUTH_MOD --> USER_MOD

    GUARDS --> CONNECTION_MOD
    DECORATORS --> GUARDS
    INTERCEPTORS --> GUARDS
```

## 🔧 Component Breakdown

### Core Components

| Component                     | Purpose                                 | Key Features                                                      |
| ----------------------------- | --------------------------------------- | ----------------------------------------------------------------- |
| **Tenant Connection Manager** | Manages database connections per tenant | Connection pooling, thread-safe initialization, automatic cleanup |
| **JWT Guard**                 | Validates authentication tokens         | Token validation, user extraction, security                       |
| **Tenant Guard**              | Resolves tenant context                 | Tenant validation, connection attachment, isolation               |
| **Auth Service**              | Handles authentication logic            | Login/logout, token generation, user validation                   |
| **Tenant Service**            | Manages tenant lifecycle                | Creation, configuration, database setup                           |

### Data Flow Components

| Layer              | Components                    | Responsibilities                                                   |
| ------------------ | ----------------------------- | ------------------------------------------------------------------ |
| **Presentation**   | Controllers, DTOs, Validation | Request handling, response formatting, input validation            |
| **Business Logic** | Services, Domain Logic        | Business rules, data transformation, orchestration                 |
| **Data Access**    | Repositories, Entities        | Data persistence, query optimization, transaction management       |
| **Infrastructure** | Connection Manager, Config    | Database connections, environment configuration, external services |

## 🚀 Deployment Architecture

```mermaid
graph TB
    subgraph "Production Environment"
        subgraph "Load Balancer Tier"
            ALB[Application Load Balancer]
        end

        subgraph "Application Tier"
            APP1[NestJS Instance 1]
            APP2[NestJS Instance 2]
            APPN[NestJS Instance N]
        end

        subgraph "Database Tier"
            CENTRAL_PROD[(Central DB - Primary)]
            CENTRAL_REPLICA[(Central DB - Replica)]

            TENANT_CLUSTER1[(Tenant Cluster 1)]
            TENANT_CLUSTER2[(Tenant Cluster 2)]
            TENANT_CLUSTERN[(Tenant Cluster N)]
        end

        subgraph "Infrastructure Services"
            REDIS[(Redis Cache)]
            LOGS_SVC[Log Aggregation]
            METRICS_SVC[Metrics & Monitoring]
            BACKUP[Backup Service]
        end
    end

    ALB --> APP1
    ALB --> APP2
    ALB --> APPN

    APP1 --> CENTRAL_PROD
    APP2 --> CENTRAL_PROD
    APPN --> CENTRAL_PROD

    APP1 --> TENANT_CLUSTER1
    APP1 --> TENANT_CLUSTER2
    APP1 --> TENANT_CLUSTERN

    APP1 --> REDIS
    APP2 --> REDIS
    APPN --> REDIS

    CENTRAL_PROD --> CENTRAL_REPLICA

    TENANT_CLUSTER1 --> BACKUP
    TENANT_CLUSTER2 --> BACKUP
    TENANT_CLUSTERN --> BACKUP
```

## 📊 Performance Considerations

### Connection Pooling Strategy

```
Tenant Connection Manager
├── Connection Cache (In-Memory)
│   ├── Active Connections: Map<tenantId, DataSource>
│   ├── Initialization Promises: Map<tenantId, Promise>
│   └── Connection Cleanup: TTL-based eviction
├── Pool Configuration
│   ├── Max Connections per Tenant: 10
│   ├── Connection Timeout: 60s
│   └── Idle Timeout: 5 minutes
└── Health Monitoring
    ├── Connection Health Checks
    ├── Failed Connection Retry Logic
    └── Circuit Breaker Pattern
```

### Scalability Patterns

1. **Horizontal Scaling**: Multiple NestJS instances
2. **Database Sharding**: Tenant databases across different clusters
3. **Caching Strategy**: Redis for session management and frequent queries
4. **Connection Optimization**: Lazy loading and connection reuse
5. **Resource Isolation**: Tenant-specific resource limits

This architecture provides a robust, scalable, and secure multi-tenant backend solution with clear separation of concerns and efficient resource management.
