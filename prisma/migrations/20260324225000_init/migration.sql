-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "debtorName" TEXT NOT NULL,
    "registration" TEXT NOT NULL,
    "referenceDate" TIMESTAMP(3) NOT NULL,
    "sourceIssueDate" TIMESTAMP(3) NOT NULL,
    "totalDebtCents" INTEGER NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "storedSourcePath" TEXT NOT NULL,
    "storedCertificatePath" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);
