import z from "zod";

export const CertificationSchema = z.object({
    _id: z.string().optional(),
    title:z.string().min(1, "Title is required"),
    issuer: z.string().min(1, "Issuer is required"),
    issueDate: z.string().min(1, "Date is required"),
    expirationDate: z.string().min(1, "Expiration date is required"),
    credentialID: z.string().min(1, "Credential ID is required"),
    credentialURL: z.string().min(1, "Credential URL is required"),
    skillsCoverd: z.array(z.string().min(1, "Skills covered is required")),
});

export type CertificationType = z.infer<typeof CertificationSchema>;
