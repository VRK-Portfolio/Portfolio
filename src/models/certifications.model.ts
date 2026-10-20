import { CertificationType } from "@/@types/Certification.types";
import { Model, models, Schema, model } from "mongoose";

const certificationSchema = new Schema<CertificationType>({
    title: { type: String, required: true },
    issuer: { type: String, required: true },
    issueDate: { type: String, required: true },
    expirationDate: { type: String, required: true },
    credentialID: { type: String, required: true },
    credentialURL: { type: String, required: true },
    skillsCoverd: { type: [String], required: true }
});


export const CertificationModel: Model<CertificationType> = (models.Certification as Model<CertificationType>) || model<CertificationType>('certification', certificationSchema);

