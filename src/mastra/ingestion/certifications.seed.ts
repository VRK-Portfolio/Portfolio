import { connectDB } from "@/libs/db";
import { CertificationModel } from "@/models/certifications.model";
import { seedDocuments } from "./seed-documents";

export async function seedCertifications() {
    await connectDB();
    const certifications = await CertificationModel.find().lean().exec();

    return seedDocuments("certifications", certifications.map(certification => ({
        id: String(certification._id),
        context: `Certification: ${certification.title}\nIssuer: ${certification.issuer}`,
        text: [
            `Title: ${certification.title}`,
            `Issuer: ${certification.issuer}`,
            `Issued: ${new Date(certification.issueDate).toISOString().slice(0, 10)}`,
            `Expires: ${new Date(certification.expirationDate).toISOString().slice(0, 10)}`,
            `Credential ID: ${certification.credentialID}`,
            `Credential URL: ${certification.credentialURL}`,
            `Skills covered: ${certification.skillsCoverd.join(", ")}`,
        ].join("\n"),
    })));
}
