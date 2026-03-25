# Certiva

Sistema simples para importar um PDF de relatorio SIGA e gerar uma certidao de debitos atuais de divida ativa.

## Stack

- Node.js
- Next.js
- TypeScript
- Prisma ORM com SQLite
- Zod
- React Hook Form
- React Query

## Como rodar

```bash
npm install
npm run prisma:push
npm run dev
```

Abra `http://localhost:3000`.

## Fluxo

1. Envie um PDF por vez.
2. O sistema extrai nome, registro, data de referencia e valor total devedor.
3. A certidao em PDF e o arquivo original ficam salvos na raiz do projeto.

## Pastas de armazenamento

- `storage/uploads`: PDFs enviados
- `storage/certidoes`: certidoes geradas

## Validacao local feita

- Upload do arquivo `AARAO FERREIRA LIMA FILHO.pdf`
- Geracao da certidao com total `R$ 5.484,36`
- Persistencia no banco SQLite e nas pastas `storage/`
