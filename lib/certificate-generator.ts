import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb } from "pdf-lib";
import type { ParsedDebtReport } from "@/lib/types";
import { formatBrazilianDate, formatCurrencyFromCents } from "@/lib/utils";

const logoPath = path.join(process.cwd(), "oabma.jpeg");

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN = 40;
const CONTENT_LEFT = 50;
const CONTENT_RIGHT = PAGE_WIDTH - 50;
const CONTENT_WIDTH = CONTENT_RIGHT - CONTENT_LEFT;

function drawWrappedText(params: {
  page: PDFPage;
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  lineHeight: number;
  font: PDFFont;
  size: number;
  color?: ReturnType<typeof rgb>;
}) {
  const { page, text, x, y, maxWidth, lineHeight, font, size, color = rgb(0.12, 0.12, 0.12) } = params;
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(nextLine, size);

    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      continue;
    }

    currentLine = nextLine;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  lines.forEach((line, index) => {
    page.drawText(line, {
      x,
      y: y - index * lineHeight,
      size,
      font,
      color,
    });
  });
}

export async function generateCertificatePdf(report: ParsedDebtReport) {
  const pdfDoc = await PDFDocument.create();
  const [fontRegular, fontBold] = await Promise.all([
    pdfDoc.embedFont(StandardFonts.Helvetica),
    pdfDoc.embedFont(StandardFonts.HelveticaBold),
  ]);
  const logoBytes = await readFile(logoPath);
  const logo = await pdfDoc.embedJpg(logoBytes);
  const logoDimensions = logo.scale(0.52);
  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let currentY = PAGE_HEIGHT - 140;

  const drawPageFrame = (currentPage: PDFPage) => {
    currentPage.drawRectangle({
      x: PAGE_MARGIN,
      y: PAGE_MARGIN,
      width: currentPage.getWidth() - PAGE_MARGIN * 2,
      height: currentPage.getHeight() - PAGE_MARGIN * 2,
      borderColor: rgb(0.78, 0.8, 0.84),
      borderWidth: 1,
    });
  };

  const drawHeader = (currentPage: PDFPage, continuation = false) => {
    drawPageFrame(currentPage);
    currentPage.drawImage(logo, {
      x: CONTENT_LEFT,
      y: 700,
      width: logoDimensions.width,
      height: logoDimensions.height,
    });

    currentPage.drawText("ORDEM DOS ADVOGADOS DO BRASIL", {
      x: CONTENT_LEFT,
      y: 670,
      size: 12,
      font: fontBold,
      color: rgb(0.1, 0.16, 0.28),
    });

    currentPage.drawText("Seccional do Maranhao", {
      x: CONTENT_LEFT,
      y: 652,
      size: 11,
      font: fontRegular,
      color: rgb(0.22, 0.25, 0.32),
    });

    currentPage.drawText("CERTIDAO DE DEBITOS ATUAIS DE DIVIDA ATIVA", {
      x: CONTENT_LEFT,
      y: continuation ? 605 : 590,
      size: continuation ? 14 : 18,
      font: fontBold,
      color: rgb(0.11, 0.14, 0.2),
    });

    currentPage.drawText(
      continuation ? "Continuacao dos debitos detalhados" : `Emitida em ${formatBrazilianDate(new Date())}`,
      {
        x: CONTENT_LEFT,
        y: continuation ? 583 : 560,
        size: 11,
        font: fontRegular,
        color: rgb(0.28, 0.31, 0.38),
      },
    );
  };

  const drawFooter = (currentPage: PDFPage) => {
    currentPage.drawText(
      "Este documento foi gerado automaticamente a partir do PDF importado na plataforma Certiva.",
      {
        x: CONTENT_LEFT,
        y: 95,
        size: 9,
        font: fontRegular,
        color: rgb(0.34, 0.36, 0.4),
      },
    );
  };

  const ensureSpace = (neededHeight: number) => {
    if (currentY - neededHeight >= 120) {
      return;
    }

    drawFooter(page);
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawHeader(page, true);
    currentY = 540;
  };

  drawHeader(page);

  drawWrappedText({
    page,
    x: CONTENT_LEFT,
    y: 500,
    maxWidth: CONTENT_WIDTH,
    lineHeight: 22,
    font: fontRegular,
    size: 12,
    text:
      `Certifico, para os devidos fins, que na data de ${formatBrazilianDate(report.referenceDate)} consta em nome de ` +
      `${report.debtorName}, registro ${report.registration}, debito atual de divida ativa no valor total de ` +
      `${formatCurrencyFromCents(report.totalDebtCents)}, conforme relatorio extraido do sistema administrativo da OAB/MA.`,
  });

  page.drawText("Dados da consulta", {
    x: CONTENT_LEFT,
    y: 370,
    size: 13,
    font: fontBold,
    color: rgb(0.1, 0.16, 0.28),
  });

  const details = [
    `Nome: ${report.debtorName}`,
    `Registro: ${report.registration}`,
    `Data de referencia dos debitos: ${formatBrazilianDate(report.referenceDate)}`,
    `Data de emissao do relatorio importado: ${formatBrazilianDate(report.issueDate)}`,
  ];

  details.forEach((detail, index) => {
    page.drawText(detail, {
      x: CONTENT_LEFT,
      y: 340 - index * 24,
      size: 11,
      font: fontRegular,
      color: rgb(0.18, 0.2, 0.24),
    });
  });

  currentY = 235;
  ensureSpace(80);
  page.drawText("Debitos detalhados", {
    x: CONTENT_LEFT,
    y: currentY,
    size: 13,
    font: fontBold,
    color: rgb(0.1, 0.16, 0.28),
  });
  currentY -= 18;

  const columns = [
    { label: "Ano", x: CONTENT_LEFT, width: 28 },
    { label: "Tipo", x: CONTENT_LEFT + 32, width: 26 },
    { label: "Pref.", x: CONTENT_LEFT + 62, width: 28 },
    { label: "Parc.", x: CONTENT_LEFT + 94, width: 28 },
    { label: "Numero", x: CONTENT_LEFT + 126, width: 74 },
    { label: "Emissao", x: CONTENT_LEFT + 204, width: 52 },
    { label: "Venc.", x: CONTENT_LEFT + 260, width: 48 },
    { label: "Status", x: CONTENT_LEFT + 312, width: 46 },
    { label: "Original", x: CONTENT_LEFT + 362, width: 64 },
    { label: "Atualizado", x: CONTENT_LEFT + 430, width: 86 },
  ];

  const drawTableHeader = () => {
    ensureSpace(34);
    page.drawRectangle({
      x: CONTENT_LEFT,
      y: currentY - 16,
      width: CONTENT_WIDTH,
      height: 22,
      color: rgb(0.93, 0.94, 0.96),
    });

    columns.forEach((column) => {
      page.drawText(column.label, {
        x: column.x,
        y: currentY - 8,
        size: 9,
        font: fontBold,
        color: rgb(0.18, 0.2, 0.24),
      });
    });

    currentY -= 28;
  };

  drawTableHeader();

  report.debtEntries.forEach((entry) => {
    ensureSpace(24);

    const values = [
      entry.year,
      entry.type,
      entry.prefix,
      entry.parcel,
      entry.number,
      formatBrazilianDate(entry.issueDate),
      formatBrazilianDate(entry.dueDate),
      entry.status,
      formatCurrencyFromCents(entry.originalValueCents),
      formatCurrencyFromCents(entry.updatedValueCents),
    ];

    values.forEach((value, index) => {
      page.drawText(value, {
        x: columns[index].x,
        y: currentY,
        size: 8,
        font: fontRegular,
        color: rgb(0.18, 0.2, 0.24),
      });
    });

    page.drawLine({
      start: { x: CONTENT_LEFT, y: currentY - 5 },
      end: { x: CONTENT_RIGHT, y: currentY - 5 },
      thickness: 0.5,
      color: rgb(0.88, 0.89, 0.92),
    });

    currentY -= 20;
  });

  ensureSpace(90);
  currentY -= 8;
  page.drawRectangle({
    x: CONTENT_LEFT,
    y: currentY - 34,
    width: CONTENT_WIDTH,
    height: 42,
    color: rgb(0.95, 0.92, 0.85),
  });

  page.drawText("Valor total devedor", {
    x: CONTENT_LEFT + 12,
    y: currentY - 18,
    size: 12,
    font: fontBold,
    color: rgb(0.18, 0.16, 0.12),
  });

  page.drawText(formatCurrencyFromCents(report.totalDebtCents), {
    x: CONTENT_RIGHT - 110,
    y: currentY - 18,
    size: 12,
    font: fontBold,
    color: rgb(0.18, 0.16, 0.12),
  });

  currentY -= 70;

  drawWrappedText({
    page,
    x: CONTENT_LEFT,
    y: currentY,
    maxWidth: CONTENT_WIDTH,
    lineHeight: 18,
    font: fontRegular,
    size: 10,
    text:
      "A relacao acima reproduz todos os anos e todos os debitos identificados no relatorio importado. A conferencia deve ser realizada em conjunto com o PDF original armazenado no sistema.",
  });

  page.drawText("________________________________________", {
    x: CONTENT_LEFT,
    y: 135,
    size: 12,
    font: fontRegular,
    color: rgb(0.45, 0.47, 0.51),
  });

  page.drawText("Secretaria Financeira / OAB-MA", {
    x: 95,
    y: 115,
    size: 11,
    font: fontRegular,
    color: rgb(0.2, 0.22, 0.26),
  });

  pdfDoc.getPages().forEach((currentPage) => {
    drawFooter(currentPage);
  });

  return Buffer.from(await pdfDoc.save());
}
