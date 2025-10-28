import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const CentralDataSource = new DataSource({
  type: 'postgres',
  host: process.env.CENTRAL_DB_HOST || 'localhost',
  port: parseInt(process.env.CENTRAL_DB_PORT) || 5432,
  username: process.env.CENTRAL_DB_USER || 'postgres',
  password: process.env.CENTRAL_DB_PASS || 'password',
  database: process.env.CENTRAL_DB_NAME || 'central_registry',
  entities: ['src/core/tenant/*.entity{.ts,.js}'],
  migrations: ['src/migrations/central/*{.ts,.js}'],
  synchronize: false,
  logging: true,
});

export default CentralDataSource;
