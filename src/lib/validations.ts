import { z } from "zod";

export const uploadFormSchema = z.object({
  file: z
    .custom<FileList>(
      (value) => value instanceof FileList,
      "Selecione um arquivo PDF.",
    )
    .refine((files) => files.length === 1, "Selecione um arquivo PDF.")
    .refine(
      (files) => files[0]?.type === "application/pdf",
      "O arquivo deve ser um PDF.",
    )
    .refine(
      (files) => (files[0]?.size ?? 0) > 0,
      "O arquivo nao pode estar vazio.",
    ),
});

export type UploadFormValues = z.infer<typeof uploadFormSchema>;
