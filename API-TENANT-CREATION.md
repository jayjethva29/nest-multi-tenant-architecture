# Tenant Creation via API

## Overview

You can create new tenants using the REST API instead of the command-line script. This provides more flexibility for integration with web applications, automation tools, or other services.

## API Endpoint

### Create Tenant

- **Method**: `POST`
- **URL**: `http://localhost:3000/tenants`
- **Auth**: **Public** (No authentication required)
- **Content-Type**: `application/json`

## Request Body

```json
{
  "name": "Company Name",
  "database": {
    "host": "localhost",
    "port": 5432,
    "username": "postgres",
    "password": "password"
  },
  "poolOptions": {
    "max": 5,
    "min": 0,
    "acquireTimeout": 60000,
    "timeout": 60000,
    "idleTimeoutMillis": 30000
  },
  "adminUser": {
    "email": "admin@company.com",
    "password": "securePassword123",
    "firstName": "Admin",
    "lastName": "User"
  }
}
```

### Required Fields

- `name` (string): Tenant display name
- `database.host` (string): Database host
- `database.username` (string): Database username
- `database.password` (string): Database password
- `adminUser.email` (string): Admin user email (must be valid email format)
- `adminUser.password` (string): Admin user password (minimum 6 characters)
- `adminUser.firstName` (string): Admin user first name
- `adminUser.lastName` (string): Admin user last name

### Optional Fields

- `database.port` (number): Database port (default: 5432)
- `poolOptions` (object): Database connection pool configuration
- All pool option properties are optional with sensible defaults

## Response

### Success (201 Created)

```json
{
  "id": "d2763724-087c-46a3-9ac4-1747a89e333a",
  "name": "Company Name",
  "active": true,
  "createdAt": "2025-10-29T10:30:00.000Z",
  "adminToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "status": "provisioned"
}
```

### Error Responses

#### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": [
    "adminUser.email must be an email",
    "adminUser.password must be longer than or equal to 6 characters"
  ],
  "error": "Bad Request"
}
```

#### 409 Conflict

```json
{
  "statusCode": 409,
  "message": "User with email 'admin@company.com' already exists",
  "error": "Conflict"
}
```

## Usage Examples

### Using cURL

```bash
curl -X POST http://localhost:3000/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ACME Corporation",
    "database": {
      "host": "localhost",
      "port": 5432,
      "username": "postgres",
      "password": "password"
    },
    "adminUser": {
      "email": "admin@acme.com",
      "password": "securePass123",
      "firstName": "John",
      "lastName": "Admin"
    }
  }'
```

### Using JavaScript/Fetch

```javascript
const createTenant = async () => {
  try {
    const response = await fetch('http://localhost:3000/tenants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'My Company',
        database: {
          host: 'localhost',
          port: 5432,
          username: 'postgres',
          password: 'password',
        },
        adminUser: {
          email: 'admin@mycompany.com',
          password: 'strongPassword123',
          firstName: 'Admin',
          lastName: 'User',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Tenant created:', result);

    // Save the admin token for future API calls
    localStorage.setItem('adminToken', result.adminToken);
    localStorage.setItem('tenantId', result.id);

    return result;
  } catch (error) {
    console.error('Error creating tenant:', error);
    throw error;
  }
};
```

### Using Python/requests

```python
import requests
import json

def create_tenant():
    url = "http://localhost:3000/tenants"

    payload = {
        "name": "Python Company",
        "database": {
            "host": "localhost",
            "port": 5432,
            "username": "postgres",
            "password": "password"
        },
        "adminUser": {
            "email": "admin@python.com",
            "password": "pythonPass123",
            "firstName": "Python",
            "lastName": "Admin"
        }
    }

    headers = {
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, data=json.dumps(payload), headers=headers)
        response.raise_for_status()

        result = response.json()
        print(f"Tenant created: {result['id']}")
        print(f"Admin token: {result['adminToken']}")

        return result
    except requests.exceptions.RequestException as e:
        print(f"Error creating tenant: {e}")
        raise
```

## What Gets Created

When you call the API, the following is automatically created:

1. **✅ Tenant Database**: New PostgreSQL database with unique name
2. **✅ Database Tables**: All required tables (users, products, permissions, roles, etc.)
3. **✅ Default Permissions**: 13 default permissions for users, products, and roles
4. **✅ Default Roles**:
   - `admin` (full access)
   - `manager` (moderate access)
   - `user` (read-only, default for new users)
   - `viewer` (read-only all resources)
5. **✅ Admin User**: Created with provided credentials
6. **✅ Role Assignment**: Admin user gets both `admin` and `user` roles
7. **✅ Access Token**: JWT token for immediate API access

## Using the Admin Token

Once you have the admin token from the response, you can use it to access all tenant APIs:

```bash
# Example: Get all users
curl -X GET http://localhost:3000/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "X-Tenant-ID: YOUR_TENANT_ID"

# Example: Create a new user
curl -X POST http://localhost:3000/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "X-Tenant-ID: YOUR_TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@company.com",
    "password": "userPass123",
    "firstName": "New",
    "lastName": "User"
  }'
```

## Environment Configuration

Make sure your application has the following environment variables configured:

```env
# Central Database (for tenant registry)
CENTRAL_DB_HOST=localhost
CENTRAL_DB_PORT=5432
CENTRAL_DB_NAME=multi_tenant_central
CENTRAL_DB_USER=postgres
CENTRAL_DB_PASS=password

# Admin Database (for creating tenant databases)
ADMIN_DB_HOST=localhost
ADMIN_DB_PORT=5432
ADMIN_DB_USER=postgres
ADMIN_DB_PASS=password

# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRE_TIME=1h

# Other settings
BCRYPT_ROUNDS=12
```

## Advantages of API vs Script

### API Advantages:

- **Integration**: Easy to integrate with web applications
- **Programmatic**: Can be called from any programming language
- **Validation**: Built-in request validation with detailed error messages
- **Scalable**: Can be deployed and called remotely
- **Standardized**: RESTful API follows standard conventions

### Script Advantages:

- **Simple**: Direct command-line usage
- **No Server**: Doesn't require running the NestJS application
- **DevOps**: Good for deployment scripts and automation

## Error Handling

The API provides detailed error messages for common issues:

- **Invalid email format**: "adminUser.email must be an email"
- **Weak password**: "adminUser.password must be longer than or equal to 6 characters"
- **Missing fields**: "adminUser.firstName should not be empty"
- **Database connection**: "Failed to connect to database"
- **Duplicate tenant**: "Tenant already exists"

## Security Considerations

1. **Public Endpoint**: The tenant creation endpoint is public by design for initial setup
2. **Production**: In production, consider adding rate limiting or IP restrictions
3. **Validation**: All input is validated before processing
4. **Database Isolation**: Each tenant gets a completely isolated database
5. **Token Security**: Store admin tokens securely (never in localStorage in production)

## Next Steps

After creating a tenant via API:

1. **Save Credentials**: Store the tenant ID and admin token securely
2. **Test Access**: Use the token to access tenant APIs
3. **Create Users**: Add additional users via the users API
4. **Assign Roles**: Manage user permissions through the roles API
5. **Build Application**: Integrate tenant creation into your application workflow
