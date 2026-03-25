import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ParsedDebtEntry, ParsedDebtReport } from "@/lib/types";
import { parseBrazilianCurrencyToCents, parseBrazilianDate } from "@/lib/utils";

function getTrimmedLines(rawText: string) {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseDebtEntries(lines: string[]): ParsedDebtEntry[] {
  const entries: ParsedDebtEntry[] = [];

  for (const line of lines) {
    if (!/^\d{4}\s/.test(line)) {
      continue;
    }

    const parts = line.split(/\s+/);
    if (parts.length < 16) {
      continue;
    }

    entries.push({
      year: parts[0],
      type: parts[1],
      prefix: parts[2],
      number: parts[3],
      parcel: parts[4],
      status: parts[5],
      issueDate: parseBrazilianDate(parts[6]),
      originalValueCents: parseBrazilianCurrencyToCents(parts[7]),
      dueDate: parseBrazilianDate(parts[10]),
      updatedValueCents: parseBrazilianCurrencyToCents(parts[15]),
    });
  }

  return entries;
}

export async function parseDebtReportFromBuffer(
  buffer: Buffer,
): Promise<ParsedDebtReport> {
  const { PDFParse } = await import("pdf-parse");
  PDFParse.setWorker(
    pathToFileURL(
      path.join(
        process.cwd(),
        "node_modules",
        "pdfjs-dist",
        "legacy",
        "build",
        "pdf.worker.mjs",
      ),
    ).href,
  );
  const parser = new PDFParse({ data: buffer });
  try {
    const parsed = await parser.getText();
    const rawText = parsed.text;
    const normalizedText = rawText
      .replace(/[ \t]+/g, " ")
      .replace(/\n+/g, "\n");
    const lines = getTrimmedLines(normalizedText);

    let registration = "";
    let debtorName = "";

    const headerIndex = lines.findIndex((line) => line.startsWith("Registro "));
    if (headerIndex !== -1) {
      const candidateLine = lines[headerIndex + 1] ?? "";
      const candidateMatch = candidateLine.match(/^(\d+)\s+(.+)$/);

      if (candidateMatch) {
        registration = candidateMatch[1];
        debtorName = candidateMatch[2];
      }
    }

    if (!registration || !debtorName) {
      const fallbackMatch = normalizedText.match(
        /Registro\s+Nome Cliente\s+(\d+)\s+(.+?)\s+Ano\.Cob\./s,
      );

      if (fallbackMatch) {
        registration = fallbackMatch[1];
        debtorName = fallbackMatch[2].replace(/\s+/g, " ").trim();
      }
    }

    if (!registration || !debtorName) {
      throw new Error(
        "Nao foi possivel identificar o registro e o nome do devedor no PDF importado.",
      );
    }

    const refMatch = normalizedText.match(/Dt\.Ref:\s*(\d{2}\/\d{2}\/\d{4})/);
    const issueMatch = normalizedText.match(
      /Emiss[aã]o:\s*(\d{2}\/\d{2}\/\d{4})/,
    );
    const currencyMatches = [
      ...normalizedText.matchAll(/\b\d{1,3}(?:\.\d{3})*,\d{2}\b/g),
    ].map((match) => match[0]);

    if (!refMatch || !issueMatch || currencyMatches.length === 0) {
      throw new Error(
        "Nao foi possivel extrair os dados financeiros e de referencia do PDF importado.",
      );
    }

    const debtEntries = parseDebtEntries(lines);

    if (debtEntries.length === 0) {
      throw new Error(
        "Nao foi possivel extrair os debitos detalhados do PDF importado.",
      );
    }

    const totalDebtMatch = currencyMatches.at(-1);

    if (!totalDebtMatch) {
      throw new Error(
        "Nao foi possivel extrair o valor total do PDF importado.",
      );
    }

    const totalDebtCents = parseBrazilianCurrencyToCents(totalDebtMatch);

    return {
      debtorName,
      registration,
      referenceDate: parseBrazilianDate(refMatch[1]),
      issueDate: parseBrazilianDate(issueMatch[1]),
      totalDebtCents,
      debtEntries,
      rawText: normalizedText,
    };
  } finally {
    await parser.destroy();
  }
}
