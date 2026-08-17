import type { NextFunction, Request, Response } from "express";
import { createSupabaseClient } from "./client";
import { prisma } from "./db";

const client = createSupabaseClient()
export async function middleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    let userId: string | undefined;
    let user: Awaited<ReturnType<typeof client.auth.getUser>>["data"]["user"] = null;
    try {
        const data = await client.auth.getUser(token);
        user = data.data.user;
        userId = user?.id;
    } catch (e) {
        console.error("Failed to verify token:", e);
        return res.status(401).json({ message: "Unauthorized" });
    }

    if (!userId || !user) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const provider = user.app_metadata?.provider === "google" ? "Google" : "Github";
        await prisma.user.upsert({
            where: { id: userId },
            update: {
                email: user.email ?? "",
                name: user.user_metadata?.full_name ?? "",
                provider,
            },
            create: {
                id: userId,
                email: user.email ?? "",
                provider,
                name: user.user_metadata?.full_name ?? "",
                supabase_id: userId,
            },
        });
    } catch (e) {
        console.error("Failed to create user:", e);
        return res.status(500).json({ message: "Internal server error" });
    }

    req.userId = userId;
    next();
}
