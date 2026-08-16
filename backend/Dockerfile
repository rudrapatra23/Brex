FROM oven/bun:1

WORKDIR /app

COPY . .
RUN bun install --frozen-lockfile
RUN bunx prisma generate

ENV PORT=3001
EXPOSE 3001

CMD ["bun", "run", "index.ts"]
