import { defineConfig, env } from 'prisma/config';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

if (typeof process.loadEnvFile === 'function') {
  if (existsSync(resolve(process.cwd(), '.env'))) {
    process.loadEnvFile(resolve(process.cwd(), '.env'));
  } else if (existsSync(resolve(__dirname, '.env'))) {
    process.loadEnvFile(resolve(__dirname, '.env'));
  }
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    directory: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
