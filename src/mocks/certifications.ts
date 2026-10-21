import type { ApiGetResponse } from "@/@types/ApiResponse.types";
import type { CertificationType } from "@/@types/Certification.types";
import { http, HttpResponse } from "msw";

export const mockCertifications: CertificationType[] = [
    {
        _id: "6ad60785c4daf1c34ef66c38",
        title: "Cloud Developer",
        issuer: "Example Academy",
        issueDate: "2025-01-01",
        expirationDate: "2027-01-01",
        credentialID: "CLOUD-123",
        credentialURL: "https://example.com/credentials/cloud",
        skillsCoverd: ["Cloud computing", "APIs"],
    },
    {
        _id: "6ad60785c4daf1c34ef66c39",
        title: "Web Developer",
        issuer: "Web Academy",
        issueDate: "2025-02-01",
        expirationDate: "2027-02-01",
        credentialID: "WEB-456",
        credentialURL: "https://example.com/credentials/web",
        skillsCoverd: ["HTML", "CSS"],
    },
];

export const certificationHandlers = [
    http.get("*/api/certifications", () => HttpResponse.json<ApiGetResponse<CertificationType[]>>({
        success: true,
        data: mockCertifications,
    })),
];
