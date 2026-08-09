-- Add headcountNotes to Deal
ALTER TABLE "Deal" ADD COLUMN "headcountNotes" TEXT;

-- Create HeadcountLine table
CREATE TABLE "HeadcountLine" (
    "id"               TEXT    NOT NULL PRIMARY KEY,
    "dealId"           TEXT    NOT NULL,
    "department"       TEXT    NOT NULL,
    "headcountReduced" INTEGER NOT NULL DEFAULT 0,
    "peopleExpenseUSD" REAL    NOT NULL DEFAULT 0,
    "otherExpenseUSD"  REAL    NOT NULL DEFAULT 0,
    "notes"            TEXT,
    "sortOrder"        INTEGER NOT NULL DEFAULT 0,
    "createdAt"        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HeadcountLine_dealId_fkey"
        FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "HeadcountLine_dealId_idx" ON "HeadcountLine"("dealId");
