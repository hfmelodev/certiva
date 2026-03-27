import { prisma } from "@/lib/prisma";
import { deleteFileIfExists } from "@/lib/storage";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const certificate = await prisma.certificate.findUnique({
    where: { id },
  });

  if (!certificate) {
    return NextResponse.json(
      { error: "Certidao nao encontrada." },
      { status: 404 },
    );
  }

  await Promise.all([
    deleteFileIfExists(certificate.storedCertificatePath),
    deleteFileIfExists(certificate.storedSourcePath),
    prisma.certificate.delete({ where: { id } }),
  ]);

  return NextResponse.json({ id });
}
