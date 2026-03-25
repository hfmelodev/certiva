import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    return NextResponse.json({ error: "Arquivo original nao encontrado." }, { status: 404 });
  }

  const buffer = await readFile(certificate.storedSourcePath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${certificate.originalFilename}"`,
    },
  });
}
