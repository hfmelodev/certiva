import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrencyFromCents(valueInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueInCents / 100);
}

export function parseBrazilianCurrencyToCents(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  return Math.round(Number(normalized) * 100);
}

export function sanitizeFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export function parseBrazilianDate(value: string) {
  const [day, month, year] = value.split("/").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function formatBrazilianDate(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(date);
}

export function formatBrazilianLongDate(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.day} de ${values.month} de ${values.year}`;
}

const UNITS = [
  "zero",
  "um",
  "dois",
  "tres",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
];

const TEN_TO_NINETEEN = [
  "dez",
  "onze",
  "doze",
  "treze",
  "quatorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
];

const TENS = [
  "",
  "",
  "vinte",
  "trinta",
  "quarenta",
  "cinquenta",
  "sessenta",
  "setenta",
  "oitenta",
  "noventa",
];

const HUNDREDS = [
  "",
  "cento",
  "duzentos",
  "trezentos",
  "quatrocentos",
  "quinhentos",
  "seiscentos",
  "setecentos",
  "oitocentos",
  "novecentos",
];

function numberToPortugueseWords(value: number): string {
  if (value === 0) {
    return "zero";
  }

  if (value === 100) {
    return "cem";
  }

  if (value < 10) {
    return UNITS[value];
  }

  if (value < 20) {
    return TEN_TO_NINETEEN[value - 10];
  }

  if (value < 100) {
    const ten = Math.floor(value / 10);
    const remainder = value % 10;

    return remainder === 0
      ? TENS[ten]
      : `${TENS[ten]} e ${numberToPortugueseWords(remainder)}`;
  }

  if (value < 1000) {
    const hundred = Math.floor(value / 100);
    const remainder = value % 100;

    return remainder === 0
      ? HUNDREDS[hundred]
      : `${HUNDREDS[hundred]} e ${numberToPortugueseWords(remainder)}`;
  }

  if (value < 1_000_000) {
    const thousands = Math.floor(value / 1000);
    const remainder = value % 1000;
    const thousandsLabel =
      thousands === 1 ? "mil" : `${numberToPortugueseWords(thousands)} mil`;

    if (remainder === 0) {
      return thousandsLabel;
    }

    const connector = remainder < 100 ? " e " : ", ";
    return `${thousandsLabel}${connector}${numberToPortugueseWords(remainder)}`;
  }

  const millions = Math.floor(value / 1_000_000);
  const remainder = value % 1_000_000;
  const millionsLabel =
    millions === 1
      ? "um milhao"
      : `${numberToPortugueseWords(millions)} milhoes`;

  if (remainder === 0) {
    return millionsLabel;
  }

  const connector = remainder < 100 ? " e " : ", ";
  return `${millionsLabel}${connector}${numberToPortugueseWords(remainder)}`;
}

export function formatCurrencyInWordsFromCents(valueInCents: number) {
  const integerPart = Math.floor(valueInCents / 100);
  const centsPart = valueInCents % 100;

  const reaisLabel =
    integerPart === 1
      ? `${numberToPortugueseWords(integerPart)} real`
      : `${numberToPortugueseWords(integerPart)} reais`;

  if (centsPart === 0) {
    return reaisLabel;
  }

  const centsLabel =
    centsPart === 1
      ? `${numberToPortugueseWords(centsPart)} centavo`
      : `${numberToPortugueseWords(centsPart)} centavos`;

  return `${reaisLabel} e ${centsLabel}`;
}
