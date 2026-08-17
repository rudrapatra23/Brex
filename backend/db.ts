import { PrismaClient } from "./prisma/generated/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const connectionString = `${process.env.SUPABASE_DATABASE_URL}`

// Certificate verification stays on unless explicitly disabled for a local /
// self-signed database, so production connections cannot be MITM'd.
const allowSelfSignedCert = process.env.DATABASE_ALLOW_SELF_SIGNED_CERT === "true"

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: !allowSelfSignedCert, ca: process.env.DATABASE_SSL_CA }
})

const adapter = new PrismaPg(pool)

export const prisma = new PrismaClient({
    adapter,
})