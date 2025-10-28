import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

export const createCentralDataSource = (configService: ConfigService): DataSource => {
  return new DataSource({
    type: 'postgres',
    host: configService.get('CENTRAL_DB_HOST'),
    port: configService.get('CENTRAL_DB_PORT'),
    username: configService.get('CENTRAL_DB_USER'),
    password: configService.get('CENTRAL_DB_PASS'),
    database: configService.get('CENTRAL_DB_NAME'),
    entities: [__dirname + '/../core/tenant/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/central/*{.ts,.js}'],
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
    poolSize: 10,
    extra: {
      connectionLimit: 10,
      acquireTimeout: 60000,
      timeout: 60000,
    },
  });
};

export const createTenantDataSource = (dbConfig: {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  poolOptions?: any;
}): DataSource => {
  return new DataSource({
    type: 'postgres',
    host: dbConfig.host,
    port: dbConfig.port,
    username: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
    entities: [__dirname + '/../modules/**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/tenant/*{.ts,.js}'],
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
    poolSize: dbConfig.poolOptions?.max || 5,
    extra: {
      connectionLimit: dbConfig.poolOptions?.max || 5,
      acquireTimeout: dbConfig.poolOptions?.acquireTimeout || 60000,
      timeout: dbConfig.poolOptions?.timeout || 60000,
      idleTimeoutMillis: dbConfig.poolOptions?.idleTimeoutMillis || 30000,
      ...dbConfig.poolOptions,
    },
  });
};
