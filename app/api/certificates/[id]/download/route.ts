import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeFilename } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const certificate = await prisma.certificate.findUnique({
    where: { id },
  });

  if (!certificate) {
    return NextResponse.json({ error: "Certidao nao encontrada." }, { status: 404 });
  }

  const buffer = await readFile(certificate.storedCertificatePath);
  const fileName = `${sanitizeFilename(certificate.debtorName)}-certidao.pdf`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
