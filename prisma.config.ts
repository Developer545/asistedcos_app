import { config } from 'dotenv';
// Next.js usa .env.local — cargar antes que el config de Prisma
config({ path: '.env.local' });
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
