"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { CertificateListItem } from "@/lib/types";
import { formatBrazilianDate, formatCurrencyFromCents } from "@/lib/utils";
import { uploadFormSchema, type UploadFormValues } from "@/lib/validations";

async function fetchCertificates(query: string): Promise<CertificateListItem[]> {
  const searchParams = new URLSearchParams();

  if (query.trim()) {
    searchParams.set("query", query.trim());
  }

  const response = await fetch(`/api/certificates?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error("Nao foi possivel carregar as certidoes.");
  }

  return response.json();
}

export function CertificateDashboard() {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  const certificatesQuery = useQuery({
    queryKey: ["certificates", debouncedSearchTerm],
    queryFn: () => fetchCertificates(debouncedSearchTerm),
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

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="eyebrow">Certiva</span>
          <h1>Geracao simples de certidao de debitos de divida ativa</h1>
          <p>
            Importe um PDF do relatorio SIGA, gere a certidao automaticamente e
            mantenha o relatorio original e o documento final salvos na raiz do projeto.
          </p>
        </div>

        <form
          className="upload-card"
          onSubmit={handleSubmit((values) => {
            setSuccessMessage(null);
            mutation.mutate(values);
          })}
        >
          <label className="field">
            <span>PDF do relatorio</span>
            <input
              type="file"
              accept="application/pdf"
              {...register("file")}
            />
          </label>

          {errors.file ? <p className="feedback error">{errors.file.message}</p> : null}
          {mutation.isError ? (
            <p className="feedback error">{mutation.error.message}</p>
          ) : null}
          {successMessage ? <p className="feedback success">{successMessage}</p> : null}

          <button className="primary-button" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Gerando certidao..." : "Importar PDF e gerar certidao"}
          </button>
        </form>
      </section>

      <section className="list-section">
        <div className="section-header">
          <div>
            <span className="eyebrow">Historico</span>
            <h2>Certidoes geradas</h2>
          </div>
          <p>{certificates.length} registro(s) processado(s)</p>
        </div>

        <div className="search-row">
          <label className="search-field">
            <span>Buscar por nome ou registro</span>
            <input
              type="search"
              placeholder="Ex.: AARAO ou 7325"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
        </div>

        {certificatesQuery.isLoading ? (
          <div className="empty-state">Carregando certidoes...</div>
        ) : certificatesQuery.isError ? (
          <div className="empty-state">Nao foi possivel carregar o historico.</div>
        ) : certificates.length === 0 ? (
          <div className="empty-state">
            {debouncedSearchTerm
              ? "Nenhuma certidao encontrada para essa busca."
              : "Nenhuma certidao gerada ainda. Use o PDF de exemplo para iniciar o fluxo."}
          </div>
        ) : (
          <div className="certificate-grid">
            {certificates.map((certificate) => (
              <article key={certificate.id} className="certificate-card">
                <div className="card-top">
                  <span className="badge">Registro {certificate.registration}</span>
                  <h3>{certificate.debtorName}</h3>
                  <p>Valor devedor atual: {formatCurrencyFromCents(certificate.totalDebtCents)}</p>
                </div>

                <dl className="meta-grid">
                  <div>
                    <dt>Referencia</dt>
                    <dd>{formatBrazilianDate(certificate.referenceDate)}</dd>
                  </div>
                  <div>
                    <dt>Relatorio emitido em</dt>
                    <dd>{formatBrazilianDate(certificate.sourceIssueDate)}</dd>
                  </div>
                  <div>
                    <dt>Arquivo original</dt>
                    <dd>{certificate.originalFilename}</dd>
                  </div>
                  <div>
                    <dt>Criado em</dt>
                    <dd>{formatBrazilianDate(certificate.createdAt)}</dd>
                  </div>
                </dl>

                <div className="actions">
                  <a className="secondary-button" href={`/api/certificates/${certificate.id}/download`}>
                    Baixar certidao
                  </a>
                  <a className="ghost-button" href={`/api/certificates/${certificate.id}/source`}>
                    Baixar PDF original
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
