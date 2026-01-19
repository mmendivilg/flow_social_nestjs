import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';

const isSSL = process.env.DB_SSL === 'true';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: isSSL ? { rejectUnauthorized: false } : false,
  synchronize: false,
  entities: [__dirname + '/../**/entities/*.entity.{ts,js}'],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  migrationsTableName: 'migrations',
  logging:
    process.env.TYPEORM_LOGGING === 'true'
      ? ['error', 'warn', 'migration']
      : ['error', 'warn'],
  extra: { connectionTimeoutMillis: 5000 },
});
