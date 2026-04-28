import "dotenv/config";
import { defineConfig } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  ...(url ? { datasource: { url } } : {}),
  // @ts-expect-error — adapter is supported at runtime in Prisma 7
  adapter: async () => {
    if (!url) throw new Error("DATABASE_URL not set");
    return new PrismaPg({ connectionString: url });
  },
});
