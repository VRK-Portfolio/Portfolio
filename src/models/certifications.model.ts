import { CertificationType } from "@/@types/Certification.types";
import mongoose, { Model, models, Schema, model } from "mongoose";

const certificationSchema = new Schema<CertificationType>({
    title: { type: String, required: true },
    issuer: { type: String, required: true },
    issueDate: { type: Date, required: true },
    expirationDate: { type: Date, required: true },
    credentialID: { type: String, required: true },
    credentialURL: { type: String, required: true },
    skillsCoverd: { type: [String], required: true }
});


export const CertificationModel: Model<CertificationType> = mongoose.models.Certification || model<CertificationType>('certification', certificationSchema);
