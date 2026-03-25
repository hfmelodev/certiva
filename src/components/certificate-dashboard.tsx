"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { CertificateListItem } from "@/lib/types";
import { formatBrazilianDate, formatCurrencyFromCents } from "@/lib/utils";
import { type UploadFormValues, uploadFormSchema } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileUp,
  Search,
  UploadCloud,
} from "lucide-react";
import {
  type DragEvent,
  type KeyboardEvent,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import { useForm } from "react-hook-form";

async function fetchCertificates(
  query: string,
): Promise<CertificateListItem[]> {
  const searchParams = new URLSearchParams();

  if (query) {
    searchParams.set("query", query);
  }

  const response = await fetch(`/api/certificates?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error("Nao foi possivel carregar as certidoes.");
  }

  return response.json();
}

const ITEMS_PER_PAGE = 10;

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function CertificateDashboard() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const deferredSearchTerm = useDeferredValue(searchTerm.trim());
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    clearErrors,
    formState: { errors },
  } = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
  });
  const selectedFile = watch("file")?.[0] ?? null;
  const fileField = register("file");

  const certificatesQuery = useQuery({
    queryKey: ["certificates", deferredSearchTerm],
    queryFn: () => fetchCertificates(deferredSearchTerm),
  });

  const mutation = useMutation({
    mutationFn: async (values: UploadFormValues) => {
      const formData = new FormData();
      formData.append("file", values.file[0]);

      const response = await fetch("/api/certificates", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Nao foi possivel gerar a certidao.");
      }

      return payload as { debtorName: string; totalDebtFormatted: string };
    },
    onSuccess: async (payload) => {
      setSuccessMessage(
        `Certidao gerada para ${payload.debtorName} com saldo total de ${payload.totalDebtFormatted}.`,
      );
      reset();
      await queryClient.invalidateQueries({ queryKey: ["certificates"] });
    },
  });

  const certificates = certificatesQuery.data ?? [];
  const totalPages = Math.max(
    1,
    Math.ceil(certificates.length / ITEMS_PER_PAGE),
  );
  const paginatedCertificates = certificates.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );
  const hasCertificates = certificates.length > 0;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  function handleFileDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDraggingFile(false);

    const files = event.dataTransfer.files;

    if (!files.length) {
      return;
    }

    clearErrors("file");
    setSuccessMessage(null);
    setValue("file", files, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }

  function handleZoneKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inputRef.current?.click();
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_24rem]">
        <Card className="border-white/80 bg-white/96">
          <CardHeader className="gap-4 border-b border-border/70">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default">Certiva</Badge>
              <Badge variant="secondary">OABMA</Badge>
            </div>
            <div className="max-w-3xl space-y-3">
              <CardTitle className="text-3xl leading-tight sm:text-4xl">
                Emissão de Certidão de Débitos Atuais de Dívida Ativa
              </CardTitle>
              <CardDescription className="max-w-2xl text-sm">
                Interface redesenhada para reduzir ruído visual e centralizar a
                operação: importação do relatório, geração do documento e
                consulta do histórico no mesmo fluxo.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="grid gap-4 pt-5 sm:grid-cols-3">
            <div className="rounded-md border border-border/70 bg-secondary/45 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                Documentos
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {certificates.length}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Total de certidões processadas no sistema.
              </p>
            </div>
            <div className="rounded-md border border-border/70 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                Leitura
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                Estrutura objetiva
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Hierarquia enxuta e foco na tabela como área principal.
              </p>
            </div>
            <div className="rounded-md border border-border/70 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                Ação principal
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                Upload por arrastar e soltar
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Importação imediata do PDF com validação e feedback local.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/10 bg-white/98">
          <CardHeader className="border-b border-border/70">
            <Badge variant="default" className="w-fit">
              Nova certidão
            </Badge>
            <CardTitle className="text-base font-semibold">
              Importar relatório
            </CardTitle>
            <CardDescription>
              Envie o PDF original para gerar uma nova certidão.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form
              className="space-y-4"
              onSubmit={handleSubmit((values) => {
                setSuccessMessage(null);
                mutation.mutate(values);
              })}
            >
              <div className="space-y-2">
                <label
                  className="text-sm font-semibold text-foreground"
                  htmlFor="certificate-file"
                >
                  PDF do relatorio
                </label>
                <button
                  type="button"
                  className={`group flex min-h-52 cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed px-5 py-6 text-center transition ${
                    isDraggingFile
                      ? "border-primary bg-primary/6"
                      : "border-border/80 bg-secondary/35 hover:border-primary/30 hover:bg-secondary/55"
                  }`}
                  onClick={() => inputRef.current?.click()}
                  onKeyDown={handleZoneKeyDown}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setIsDraggingFile(false);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDrop={handleFileDrop}
                >
                  <div className="flex size-12 items-center justify-center rounded-md bg-white text-primary shadow-sm">
                    <FileUp className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      Arraste e solte o PDF aqui
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ou clique para selecionar um arquivo do computador
                    </p>
                  </div>
                  {selectedFile ? (
                    <div className="rounded-md border border-primary/12 bg-white px-3 py-2 text-sm text-primary">
                      {selectedFile.name} · {formatFileSize(selectedFile.size)}
                    </div>
                  ) : null}
                </button>
                <input
                  id="certificate-file"
                  type="file"
                  accept="application/pdf"
                  className="sr-only"
                  name={fileField.name}
                  ref={(element) => {
                    fileField.ref(element);
                    inputRef.current = element;
                  }}
                  onBlur={fileField.onBlur}
                  onChange={(event) => {
                    fileField.onChange(event);
                    clearErrors("file");
                    setSuccessMessage(null);
                  }}
                />
              </div>

              {errors.file ? (
                <p className="rounded-md border border-accent/15 bg-accent/5 px-3 py-2 text-sm text-accent">
                  {errors.file.message}
                </p>
              ) : null}
              {mutation.isError ? (
                <p className="rounded-md border border-accent/15 bg-accent/5 px-3 py-2 text-sm text-accent">
                  {mutation.error.message}
                </p>
              ) : null}
              {successMessage ? (
                <p className="rounded-md border border-primary/12 bg-primary/5 px-3 py-2 text-sm text-primary">
                  {successMessage}
                </p>
              ) : null}

              <Button
                className="w-full"
                type="submit"
                disabled={mutation.isPending}
              >
                <UploadCloud className="size-4" />
                {mutation.isPending ? "Gerando certidão..." : "Gerar certidão"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Histórico de certidões
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Consulta, download e paginação dos documentos gerados.
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {hasCertificates
              ? `${paginatedCertificates.length} de ${certificates.length} registros`
              : "0 registro"}
          </div>
        </div>

        <Card className="overflow-hidden border-white/80 bg-white/98">
          <CardContent className="flex flex-col gap-3 border-b border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                Consulta
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pesquise por nome ou número de registro.
              </p>
            </div>
            <div className="relative w-full sm:max-w-sm">
              <label className="sr-only" htmlFor="certificate-search">
                Buscar certidões
              </label>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="certificate-search"
                type="search"
                placeholder="Buscar por nome ou registro"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>
          </CardContent>

          {certificatesQuery.isLoading ? (
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              Carregando certidoes...
            </CardContent>
          ) : certificatesQuery.isError ? (
            <CardContent className="p-10 text-center text-sm text-accent">
              Nao foi possivel carregar o historico.
            </CardContent>
          ) : certificates.length === 0 ? (
            <CardContent className="p-10 text-center">
              <div className="mx-auto flex max-w-xl flex-col items-center gap-3 text-center">
                <div className="flex size-12 items-center justify-center rounded-md bg-secondary text-primary">
                  <FileUp className="size-5" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  {deferredSearchTerm
                    ? "Nenhuma certidão encontrada."
                    : "Nenhuma certidão gerada."}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {deferredSearchTerm
                    ? "Refine a busca para localizar outro registro."
                    : "Envie um PDF para iniciar o fluxo."}
                </p>
              </div>
            </CardContent>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="bg-secondary/55 text-left text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Registro</th>
                      <th className="px-4 py-3 font-semibold">Nome</th>
                      <th className="px-4 py-3 font-semibold">Valor</th>
                      <th className="px-4 py-3 font-semibold">Referência</th>
                      <th className="px-4 py-3 font-semibold">Emitido em</th>
                      <th className="px-4 py-3 font-semibold text-right">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCertificates.map((certificate) => (
                      <tr
                        key={certificate.id}
                        className="border-t border-border/70 bg-white transition hover:bg-secondary/20"
                      >
                        <td className="px-4 py-3 font-medium text-foreground">
                          {certificate.registration}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {certificate.debtorName}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {formatCurrencyFromCents(certificate.totalDebtCents)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatBrazilianDate(certificate.referenceDate)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatBrazilianDate(certificate.sourceIssueDate)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button asChild>
                              <a
                                href={`/api/certificates/${certificate.id}/download`}
                              >
                                <Download className="size-4" />
                                Certidão
                              </a>
                            </Button>
                            <Button asChild variant="outline">
                              <a
                                href={`/api/certificates/${certificate.id}/source`}
                              >
                                Original
                              </a>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <CardFooter className="justify-between border-t border-border/70 bg-white">
                <p className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="size-4" />
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </CardFooter>
            </>
          )}
        </Card>
      </section>
    </main>
  );
}
