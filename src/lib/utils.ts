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
