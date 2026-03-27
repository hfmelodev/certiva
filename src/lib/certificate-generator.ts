import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ParsedDebtReport } from "@/lib/types";
import {
  formatBrazilianDate,
  formatBrazilianLongDate,
  formatCurrencyFromCents,
  formatCurrencyInWordsFromCents,
} from "@/lib/utils";
import {
  PDFDocument,
  type PDFFont,
  type PDFPage,
  StandardFonts,
  rgb,
} from "pdf-lib";

const logoPath = path.join(process.cwd(), "oabma.jpeg");
const treasurerSignaturePath = path.join(
  process.cwd(),
  "assinatura mariana.png",
);

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const CONTENT_LEFT = 48;
const CONTENT_RIGHT = PAGE_WIDTH - 48;
const CONTENT_WIDTH = CONTENT_RIGHT - CONTENT_LEFT;
const FOOTER_HEIGHT = 72;
const BRAND = rgb(0.07, 0.16, 0.31);
const BRAND_SOFT = rgb(0.93, 0.95, 0.98);
const TEXT = rgb(0.16, 0.18, 0.22);
const MUTED = rgb(0.42, 0.45, 0.51);
const BORDER = rgb(0.84, 0.87, 0.91);
const ACCENT = rgb(0.71, 0.57, 0.21);

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
  const {
    page,
    text,
    x,
    y,
    maxWidth,
    lineHeight,
    font,
    size,
    color = rgb(0.12, 0.12, 0.12),
  } = params;
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

  for (const [index, line] of lines.entries()) {
    page.drawText(line, {
      x,
      y: y - index * lineHeight,
      size,
      font,
      color,
    });
  }

  return lines.length;
}

export async function generateCertificatePdf(report: ParsedDebtReport) {
  const pdfDoc = await PDFDocument.create();
  const [fontRegular, fontBold] = await Promise.all([
    pdfDoc.embedFont(StandardFonts.Helvetica),
    pdfDoc.embedFont(StandardFonts.HelveticaBold),
  ]);
  const [logoBytes, signatureBytes] = await Promise.all([
    readFile(logoPath),
    readFile(treasurerSignaturePath),
  ]);
  const logo = await pdfDoc.embedJpg(logoBytes);
  const signature = await pdfDoc.embedPng(signatureBytes);
  const logoDimensions = logo.scale(0.235);
  const signatureDimensions = signature.scale(0.16);
  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let currentY = PAGE_HEIGHT - 176;

  const drawRightAlignedText = (
    text: string,
    x: number,
    y: number,
    size: number,
    font: PDFFont,
    color = TEXT,
  ) => {
    page.drawText(text, {
      x: x - font.widthOfTextAtSize(text, size),
      y,
      size,
      font,
      color,
    });
  };

  const drawSectionTitle = (title: string, subtitle?: string) => {
    page.drawText(title, {
      x: CONTENT_LEFT,
      y: currentY,
      size: 12.5,
      font: fontBold,
      color: BRAND,
    });

    if (subtitle) {
      page.drawText(subtitle, {
        x: CONTENT_LEFT,
        y: currentY - 15,
        size: 8.7,
        font: fontRegular,
        color: MUTED,
      });
      currentY -= 32;
      return;
    }

    currentY -= 22;
  };

  const drawHeader = (currentPage: PDFPage, continuation = false) => {
    currentPage.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - 18,
      width: PAGE_WIDTH,
      height: 18,
      color: BRAND,
    });

    const orgNameY = PAGE_HEIGHT - 49;
    const orgSectionY = PAGE_HEIGHT - 64;
    const rightLabelY = PAGE_HEIGHT - 47;
    const headerBlockCenterY =
      (Math.max(orgNameY, rightLabelY) + orgSectionY) / 2;

    currentPage.drawImage(logo, {
      x: CONTENT_LEFT,
      y: headerBlockCenterY - logoDimensions.height / 2,
      width: logoDimensions.width,
      height: logoDimensions.height,
    });

    const orgName = "ORDEM DOS ADVOGADOS DO BRASIL";
    const orgNameWidth = fontBold.widthOfTextAtSize(orgName, 10.2);
    const orgSection = "Seccional do Maranhao";
    const orgSectionWidth = fontRegular.widthOfTextAtSize(orgSection, 8.8);
    const centerX = PAGE_WIDTH / 2;

    currentPage.drawText(orgName, {
      x: centerX - orgNameWidth / 2,
      y: orgNameY,
      size: 10.2,
      font: fontBold,
      color: BRAND,
    });

    currentPage.drawText(orgSection, {
      x: centerX - orgSectionWidth / 2,
      y: orgSectionY,
      size: 8.8,
      font: fontRegular,
      color: MUTED,
    });

    const rightLabel = continuation ? "PAGINA CONTINUADA" : "TESOURARIA";
    const rightLabelWidth = fontBold.widthOfTextAtSize(rightLabel, 8.5);
    currentPage.drawText(rightLabel, {
      x: CONTENT_RIGHT - rightLabelWidth,
      y: rightLabelY,
      size: 8.5,
      font: fontBold,
      color: ACCENT,
    });

    currentPage.drawRectangle({
      x: CONTENT_LEFT,
      y: PAGE_HEIGHT - 150,
      width: CONTENT_WIDTH,
      height: continuation ? 48 : 62,
      color: BRAND_SOFT,
      borderColor: BORDER,
      borderWidth: 1,
    });

    const title = "Certidao de Inadimplencia";
    currentPage.drawText(title, {
      x: CONTENT_LEFT + 18,
      y: PAGE_HEIGHT - 121,
      size: continuation ? 17 : 19,
      font: fontBold,
      color: BRAND,
    });

    currentPage.drawText(
      continuation
        ? "Detalhamento financeiro complementar"
        : `Posicao financeira atualizada em ${formatBrazilianLongDate(report.referenceDate)}`,
      {
        x: CONTENT_LEFT + 18,
        y: PAGE_HEIGHT - 140,
        size: 9.4,
        font: fontRegular,
        color: MUTED,
      },
    );

    drawRightAlignedText(
      `Emissao ${formatBrazilianDate(report.issueDate)}`,
      CONTENT_RIGHT - 18,
      PAGE_HEIGHT - 140,
      9,
      fontRegular,
      MUTED,
    );

    currentPage.drawRectangle({
      x: CONTENT_LEFT,
      y: PAGE_HEIGHT - 154,
      width: 86,
      height: 4,
      color: ACCENT,
    });
  };

  const drawFooter = (currentPage: PDFPage) => {
    currentPage.drawLine({
      start: { x: CONTENT_LEFT, y: FOOTER_HEIGHT + 10 },
      end: { x: CONTENT_RIGHT, y: FOOTER_HEIGHT + 10 },
      thickness: 0.5,
      color: BORDER,
    });

    const footerTitle =
      "Ordem dos Advogados do Brasil Seccional Maranhao - OAB/MA";
    const footerTitleWidth = fontBold.widthOfTextAtSize(footerTitle, 8.2);
    currentPage.drawText(footerTitle, {
      x: (PAGE_WIDTH - footerTitleWidth) / 2,
      y: 46,
      size: 8.2,
      font: fontBold,
      color: TEXT,
    });

    const footerAddress =
      "Rua Dr. Pedro Emanoel de Oliveira, N 01 - CEP 65076-908 - Calhau - Sao Luis, MA - Brasil";
    const footerAddressWidth = fontRegular.widthOfTextAtSize(
      footerAddress,
      7.1,
    );
    currentPage.drawText(footerAddress, {
      x: (PAGE_WIDTH - footerAddressWidth) / 2,
      y: 32,
      size: 7.1,
      font: fontRegular,
      color: MUTED,
    });

    const footerContact =
      "Central de Atendimento: (98) 2107-5454 | E-mail: gabinete@oabma.org.br";
    const footerContactWidth = fontRegular.widthOfTextAtSize(
      footerContact,
      7.1,
    );
    currentPage.drawText(footerContact, {
      x: (PAGE_WIDTH - footerContactWidth) / 2,
      y: 20,
      size: 7.1,
      font: fontRegular,
      color: MUTED,
    });
  };

  const ensureSpace = (neededHeight: number) => {
    if (currentY - neededHeight >= FOOTER_HEIGHT + 96) {
      return false;
    }

    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawHeader(page, true);
    currentY = PAGE_HEIGHT - 178;
    return true;
  };

  drawHeader(page);

  const amountInWords = formatCurrencyInWordsFromCents(report.totalDebtCents);
  const paragraphText = `Certifico, para os devidos fins, que, apos revisao dos arquivos da Tesouraria da Ordem dos Advogados do Brasil - Seccional Maranhao, consta que o(a) advogado(a) ${report.debtorName}, inscrito(a) na OAB/MA sob o no ${report.registration}, apresenta pendencia financeira perante esta Seccional, totalizando ${formatCurrencyFromCents(report.totalDebtCents)} (${amountInWords}), com atualizacao considerada ate ${formatBrazilianLongDate(report.referenceDate)}.`;
  const introLineCount = drawWrappedText({
    page,
    x: CONTENT_LEFT,
    y: currentY,
    maxWidth: CONTENT_WIDTH,
    lineHeight: 17,
    font: fontRegular,
    size: 10.8,
    color: TEXT,
    text: paragraphText,
  });
  currentY -= introLineCount * 17 + 24;

  page.drawRectangle({
    x: CONTENT_LEFT,
    y: currentY - 54,
    width: CONTENT_WIDTH,
    height: 66,
    color: rgb(0.98, 0.99, 1),
    borderColor: BORDER,
    borderWidth: 1,
  });

  page.drawText("Resumo da Certidao", {
    x: CONTENT_LEFT + 16,
    y: currentY - 10,
    size: 10.4,
    font: fontBold,
    color: BRAND,
  });

  const summaryItems = [
    {
      label: "Advogado(a)",
      value: report.debtorName,
      x: CONTENT_LEFT + 16,
      y: currentY - 28,
    },
    {
      label: "Registro",
      value: report.registration,
      x: CONTENT_LEFT + 16,
      y: currentY - 46,
    },
    {
      label: "Referencia",
      value: formatBrazilianDate(report.referenceDate),
      x: CONTENT_LEFT + 255,
      y: currentY - 28,
    },
    {
      label: "Valor Total",
      value: formatCurrencyFromCents(report.totalDebtCents),
      x: CONTENT_LEFT + 255,
      y: currentY - 46,
    },
  ];

  for (const item of summaryItems) {
    page.drawText(item.label, {
      x: item.x,
      y: item.y,
      size: 8.2,
      font: fontBold,
      color: MUTED,
    });

    page.drawText(item.value, {
      x: item.x + 58,
      y: item.y,
      size: 9.6,
      font: item.label === "Valor Total" ? fontBold : fontRegular,
      color: TEXT,
    });
  }

  currentY -= 84;
  drawSectionTitle(
    "Composição dos Débitos",
    "Juros de 1% ao mes, multa de 2% apos o vencimento e correção monetária pelo INPC.",
  );

  const columns = [
    { label: "Tipo", x: CONTENT_LEFT, align: "left" as const },
    { label: "Ano", x: CONTENT_LEFT + 36, align: "left" as const },
    { label: "Parc.", x: CONTENT_LEFT + 74, align: "left" as const },
    { label: "Vencimento", x: CONTENT_LEFT + 108, align: "left" as const },
    { label: "Original", x: CONTENT_LEFT + 196, align: "right" as const },
    { label: "Correcao", x: CONTENT_LEFT + 282, align: "right" as const },
    { label: "Juros", x: CONTENT_LEFT + 358, align: "right" as const },
    { label: "Multa", x: CONTENT_LEFT + 419, align: "right" as const },
    { label: "Subtotal", x: CONTENT_LEFT + 483, align: "right" as const },
  ];

  const drawTableHeader = () => {
    ensureSpace(44);

    page.drawRectangle({
      x: CONTENT_LEFT,
      y: currentY - 12,
      width: CONTENT_WIDTH,
      height: 24,
      color: BRAND,
    });

    for (const column of columns) {
      page.drawText(column.label, {
        x:
          column.align === "right"
            ? column.x - fontBold.widthOfTextAtSize(column.label, 8.2)
            : column.x,
        y: currentY - 3,
        size: 8.2,
        font: fontBold,
        color: rgb(1, 1, 1),
      });
    }

    currentY -= 28;
  };

  drawTableHeader();

  let totalOriginalCents = 0;
  let totalCorrectionCents = 0;
  let totalInterestCents = 0;
  let totalPenaltyCents = 0;

  for (const entry of report.debtEntries) {
    if (ensureSpace(24)) {
      drawTableHeader();
    }

    totalOriginalCents += entry.originalValueCents;
    totalCorrectionCents += entry.monetaryCorrectionCents;
    totalInterestCents += entry.interestCents;
    totalPenaltyCents += entry.penaltyCents;

    const values = [
      entry.type,
      entry.year,
      entry.parcel,
      formatBrazilianDate(entry.dueDate),
      formatCurrencyFromCents(entry.originalValueCents),
      formatCurrencyFromCents(entry.monetaryCorrectionCents),
      formatCurrencyFromCents(entry.interestCents),
      formatCurrencyFromCents(entry.penaltyCents),
      formatCurrencyFromCents(entry.subtotalCents),
    ];

    const rowTop = currentY + 8;
    if (report.debtEntries.indexOf(entry) % 2 === 0) {
      page.drawRectangle({
        x: CONTENT_LEFT,
        y: currentY - 8,
        width: CONTENT_WIDTH,
        height: 20,
        color: rgb(0.985, 0.988, 0.995),
      });
    }

    for (const [index, value] of values.entries()) {
      const column = columns[index];
      const textWidth = fontRegular.widthOfTextAtSize(value, 8.15);
      page.drawText(value, {
        x: column.align === "right" ? column.x - textWidth : column.x,
        y: currentY,
        size: 8.15,
        font: fontRegular,
        color: TEXT,
      });
    }

    page.drawLine({
      start: { x: CONTENT_LEFT, y: rowTop - 17 },
      end: { x: CONTENT_RIGHT, y: rowTop - 17 },
      thickness: 0.4,
      color: BORDER,
    });

    currentY -= 20;
  }

  ensureSpace(110);
  page.drawRectangle({
    x: CONTENT_LEFT,
    y: currentY - 22,
    width: CONTENT_WIDTH,
    height: 34,
    color: BRAND_SOFT,
    borderColor: BORDER,
    borderWidth: 1,
  });

  const totalValues = [
    "TOTAL GERAL",
    "",
    "",
    "",
    formatCurrencyFromCents(totalOriginalCents),
    formatCurrencyFromCents(totalCorrectionCents),
    formatCurrencyFromCents(totalInterestCents),
    formatCurrencyFromCents(totalPenaltyCents),
    formatCurrencyFromCents(report.totalDebtCents),
  ];

  for (const [index, value] of totalValues.entries()) {
    const column = columns[index];
    const textWidth = fontBold.widthOfTextAtSize(value, 8.7);
    page.drawText(value, {
      x:
        index === 0
          ? CONTENT_LEFT + 12
          : column.align === "right"
            ? column.x - textWidth
            : column.x,
      y: currentY - 2,
      size: 8.7,
      font: fontBold,
      color: BRAND,
    });
  }

  currentY -= 48;

  const closingLineCount = drawWrappedText({
    page,
    x: CONTENT_LEFT,
    y: currentY,
    maxWidth: CONTENT_WIDTH,
    lineHeight: 17,
    font: fontRegular,
    size: 10.6,
    color: TEXT,
    text: "E o que me cumpre certificar. Dada e passada nesta Tesouraria da OAB/MA, para os efeitos administrativos cabiveis.",
  });
  currentY -= closingLineCount * 17 + 30;

  const signatureCenterX = PAGE_WIDTH / 2;
  const signatureWidth = signatureDimensions.width;
  const name = "MARIANA FACUNDES SERRA";
  const nameWidth = fontBold.widthOfTextAtSize(name, 10.5);
  const registration = "OAB-MA No 12.352";
  const registrationWidth = fontRegular.widthOfTextAtSize(registration, 9.5);
  const role = "Diretora Tesoureira OAB/MA";
  const roleWidth = fontRegular.widthOfTextAtSize(role, 9.5);

  const signatureBlockTop = 188;
  page.drawRectangle({
    x: CONTENT_LEFT,
    y: signatureBlockTop - 80,
    width: CONTENT_WIDTH,
    height: 92,
    color: rgb(1, 1, 1),
    borderColor: BORDER,
    borderWidth: 1,
  });

  page.drawText(`Sao Luis - MA, ${formatBrazilianLongDate(report.issueDate)}`, {
    x: CONTENT_LEFT + 18,
    y: signatureBlockTop - 70,
    size: 8.8,
    font: fontRegular,
    color: MUTED,
  });

  page.drawImage(signature, {
    x: signatureCenterX - signatureWidth / 2,
    y: signatureBlockTop - 44,
    width: signatureWidth,
    height: signatureDimensions.height,
  });

  page.drawText(name, {
    x: signatureCenterX - nameWidth / 2,
    y: signatureBlockTop - 60,
    size: 10.5,
    font: fontBold,
    color: TEXT,
  });

  page.drawText(registration, {
    x: signatureCenterX - registrationWidth / 2,
    y: signatureBlockTop - 74,
    size: 9.5,
    font: fontRegular,
    color: MUTED,
  });

  page.drawText(role, {
    x: signatureCenterX - roleWidth / 2,
    y: signatureBlockTop - 87,
    size: 9.5,
    font: fontRegular,
    color: MUTED,
  });

  for (const currentPage of pdfDoc.getPages()) {
    drawFooter(currentPage);
  }

  return Buffer.from(await pdfDoc.save());
}
