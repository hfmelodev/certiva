import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const projectRoot = process.cwd();
export const storageRoot = path.join(projectRoot, "storage");
export const uploadsDir = path.join(storageRoot, "uploads");
export const certificatesDir = path.join(storageRoot, "certidoes");

export async function ensureStorageDirs() {
  await Promise.all([
    mkdir(uploadsDir, { recursive: true }),
    mkdir(certificatesDir, { recursive: true }),
  ]);
}

export async function saveBuffer(filePath: string, buffer: Buffer) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
}
