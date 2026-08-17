FROM oven/bun:1

WORKDIR /app

COPY . .
RUN bun install --frozen-lockfile
# prisma.config.ts falls back to a local placeholder URL; the real connection
# string is supplied at runtime and never baked into the image.
RUN bunx prisma generate

ENV PORT=3001
EXPOSE 3001

CMD ["bun", "run", "index.ts"]
