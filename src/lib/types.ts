export type ParsedDebtEntry = {
  year: string;
  type: string;
  prefix: string;
  number: string;
  parcel: string;
  status: string;
  issueDate: Date;
  dueDate: Date;
  originalValueCents: number;
  updatedValueCents: number;
};

export type ParsedDebtReport = {
  debtorName: string;
  registration: string;
  referenceDate: Date;
  issueDate: Date;
  totalDebtCents: number;
  debtEntries: ParsedDebtEntry[];
  rawText: string;
};

export type CertificateListItem = {
  id: string;
  debtorName: string;
  registration: string;
  totalDebtCents: number;
  referenceDate: string;
  sourceIssueDate: string;
  originalFilename: string;
  createdAt: string;
};
