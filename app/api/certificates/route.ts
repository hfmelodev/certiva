import { randomUUID } from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";
import { generateCertificatePdf } from "@/lib/certificate-generator";
import { prisma } from "@/lib/prisma";
import { parseDebtReportFromBuffer } from "@/lib/pdf-parser";
import { certificatesDir, ensureStorageDirs, saveBuffer, uploadsDir } from "@/lib/storage";
import { formatCurrencyFromCents, sanitizeFilename } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();

  const certificates = await prisma.certificate.findMany({
    where: query
      ? {
          OR: [
            {
              debtorName: {
                contains: query,
              },
            },
            {
              registration: {
                contains: query,
              },
            },
          ],
        }
      : undefined,
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(
    certificates.map((certificate) => ({
      id: certificate.id,
      debtorName: certificate.debtorName,
      registration: certificate.registration,
      totalDebtCents: certificate.totalDebtCents,
      referenceDate: certificate.referenceDate.toISOString(),
      sourceIssueDate: certificate.sourceIssueDate.toISOString(),
      originalFilename: certificate.originalFilename,
      createdAt: certificate.createdAt.toISOString(),
    })),
  );
}

export async function POST(request: Request) {
  await ensureStorageDirs();

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Envie um arquivo PDF valido." }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "O arquivo enviado deve ser um PDF." }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const sourceBuffer = Buffer.from(arrayBuffer);

  try {
    const report = await parseDebtReportFromBuffer(sourceBuffer);
    const slug = sanitizeFilename(report.debtorName) || "certidao";
    const originalName = sanitizeFilename(file.name.replace(/\.pdf$/i, "")) || "arquivo";
    const stamp = Date.now();

    const storedSourcePath = path.join(uploadsDir, `${originalName}-${stamp}-${randomUUID()}.pdf`);
    const storedCertificatePath = path.join(
      certificatesDir,
      `${slug}-${stamp}-${randomUUID()}.pdf`,
    );

    const certificateBuffer = await generateCertificatePdf(report);

    await Promise.all([
      saveBuffer(storedSourcePath, sourceBuffer),
      saveBuffer(storedCertificatePath, certificateBuffer),
    ]);

    const certificate = await prisma.certificate.create({
      data: {
        debtorName: report.debtorName,
        registration: report.registration,
        referenceDate: report.referenceDate,
        sourceIssueDate: report.issueDate,
        totalDebtCents: report.totalDebtCents,
        originalFilename: file.name,
        storedSourcePath,
        storedCertificatePath,
        rawText: report.rawText,
      },
    });

    return NextResponse.json({
      id: certificate.id,
      debtorName: certificate.debtorName,
      totalDebtFormatted: formatCurrencyFromCents(certificate.totalDebtCents),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel processar o PDF e gerar a certidao.";

    return NextResponse.json({ error: message }, { status: 422 });
  }
}
