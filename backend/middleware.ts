import type { NextFunction, Request, Response } from "express";
import { createSupabaseClient } from "./client";
import { prisma } from "./db";

const client = createSupabaseClient()
export async function middleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    const data = await client.auth.getUser(token);
    const userId = data.data.user?.id;

    if (userId) {
        try {
            const provider = data.data.user?.app_metadata?.provider === "google" ? "Google" : "Github";
            await prisma.user.upsert({
                where: { id: data.data.user!.id },
                update: {
                    email: data.data.user?.email ?? "",
                    name: data.data.user?.user_metadata.full_name ?? "",
                    provider,
                },
                create: {
                    id: data.data.user!.id,
                    email: data.data.user?.email ?? "",
                    provider,
                    name: data.data.user?.user_metadata.full_name ?? "",
                    supabase_id: data.data.user!.id,
                },
            });
        } catch (e) {
            console.error("Failed to create user:", e);
        }
        req.userId = userId;
        next();
    } else {
        res.status(403).json({
            message: 'Incorrect inputs'
        })
    }
}