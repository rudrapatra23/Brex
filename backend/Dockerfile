FROM oven/bun:1

WORKDIR /app

ARG SUPABASE_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
ENV SUPABASE_DATABASE_URL=$SUPABASE_DATABASE_URL

COPY . .
RUN bun install --frozen-lockfile
RUN bunx prisma generate

ENV PORT=3001
EXPOSE 3001

CMD ["bun", "run", "index.ts"]
