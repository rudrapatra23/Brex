import { PrismaClient } from "./prisma/generated/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const connectionString = `${process.env.SUPABASE_DATABASE_URL}`
const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
})

const adapter = new PrismaPg(pool)

export const prisma = new PrismaClient({
    adapter,
})