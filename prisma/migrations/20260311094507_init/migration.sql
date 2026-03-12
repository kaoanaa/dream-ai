-- CreateTable
CREATE TABLE "DreamEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dreamText" TEXT NOT NULL,
    "style" TEXT,
    "resultJson" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "DreamEntry_createdAt_idx" ON "DreamEntry"("createdAt");
