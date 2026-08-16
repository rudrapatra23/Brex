FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY . .
RUN bunx prisma generate

ENV PORT=3001
EXPOSE 3001

CMD ["bun", "run", "index.ts"]
