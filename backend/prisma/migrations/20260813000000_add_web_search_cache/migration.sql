CREATE TABLE "webSearchCache" (
    "id" TEXT NOT NULL,
    "normalizedQuery" TEXT NOT NULL,
    "originalQuery" TEXT NOT NULL,
    "results" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webSearchCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "webSearchCache_normalizedQuery_key" ON "webSearchCache"("normalizedQuery");
CREATE INDEX "webSearchCache_createdAt_idx" ON "webSearchCache"("createdAt");
