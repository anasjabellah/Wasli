import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

dotenv.config({ override: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://wasli:wasli@127.0.0.1:55432/wasli?schema=public',
  },
});
