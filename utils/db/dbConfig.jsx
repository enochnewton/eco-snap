// postgresql://neondb_owner:npg_NopfKzEZy4n8@ep-quiet-lab-a8gxeo3h-pooler.eastus2.azure.neon.tech/ecosnapdb?sslmode=require

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.NEXT_PUBLIC_DATABASE_URL);

export const db = drizzle(sql, { schema });
