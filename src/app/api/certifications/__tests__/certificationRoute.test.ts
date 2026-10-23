import { CertificationType } from "@/@types/Certification.types";
import { CertificationModel } from "@/models/certifications.model";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { GET, POST } from "../route";
import { ApiGetResponse, ApiPostResponse } from "@/@types/ApiResponse.types";
import { NextRequest } from "next/server";
import { DELETE, PUT } from "../[id]/route";

vi.mock("@/libs/db", () => ({
    connectDB: vi.fn().mockResolvedValue(true)
}));
describe("Certification API Routes", () => {

    beforeEach(async () => {
        vi.restoreAllMocks();
    });

    const mockCertifications: CertificationType[] = [
        { _id: '6ad60785c4daf1c34ef66c38', title: "Certification 1", issuer: "Issuer 1", issueDate: new Date("2023-01-01"), expirationDate: new Date("2024-01-01"), credentialID: "123", credentialURL: "http://example.com", skillsCoverd: ["Skill 1"] },
        { _id: '6ad60785c4daf1c34ef66c38', title: "Certification 2", issuer: "Issuer 2", issueDate: new Date("2023-02-01"), expirationDate: new Date("2024-02-01"), credentialID: "456", credentialURL: "http://example.com", skillsCoverd: ["Skill 2"] }
    ];
    test("should cast existing date strings to Date objects", () => {
        const certification = CertificationModel.hydrate({
            ...mockCertifications[0],
            issueDate: "2023-01-01",
            expirationDate: "2024-01-01",
        });

        expect(certification.issueDate).toEqual(new Date("2023-01-01T00:00:00.000Z"));
        expect(certification.expirationDate).toEqual(new Date("2024-01-01T00:00:00.000Z"));
    });

    test("GET should preserve an Error instance message", async () => {
        vi.spyOn(CertificationModel, "find").mockRejectedValueOnce(new Error("Database unavailable"));

        const response = await GET();

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ success: false, error: "Database unavailable" });
    });

    test.each(["PUT", "DELETE"])("%s should preserve an Error instance message", async (method) => {
        const id = mockCertifications[0]._id!;
        const request = new NextRequest(`http://localhost:3000/api/certifications/${id}`, {
            method,
            ...(method === "PUT" ? { body: JSON.stringify({ title: "Updated certification" }) } : {}),
        });
        if (method === "PUT") {
            vi.spyOn(CertificationModel, "findByIdAndUpdate").mockRejectedValueOnce(new Error("Database unavailable"));
        } else {
            vi.spyOn(CertificationModel, "findByIdAndDelete").mockRejectedValueOnce(new Error("Database unavailable"));
        }

        const response = await (method === "PUT" ? PUT : DELETE)(request, { params: Promise.resolve({ id }) });

        expect(await response.json()).toEqual({ success: false, error: "Database unavailable" });
    });

    test("GET /api/certifications should return a list of certifications", async () => {
        (vi.spyOn(CertificationModel, 'find') as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockCertifications);
        const response = await GET();
        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
    });

    test("GET /api/certification should return a null if no certifications exist", async () => {
        (vi.spyOn(CertificationModel, 'find') as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
        const response = await GET();
        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
        expect(data.data.length).toBe(0);
    });

    test("GET /api/certification should throw an error if the database query fails", async () => {
        (vi.spyOn(CertificationModel, 'find') as unknown as ReturnType<typeof vi.fn>).mockRejectedValue("Database error");
        const response = await GET();
        const data: ApiGetResponse<CertificationType[]> = await response.json();
        if (!data.success) {
            expect(response.status).toBe(500);
            expect(data.success).toBe(false);
            expect(data.error).toBe("Database error");
        }
    });

    test("GET /api/certification should return an empty array if no certifications exist", async () => {
        (vi.spyOn(CertificationModel, 'find') as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
        const response = await GET();
        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
        expect(data.data.length).toBe(0);
    });

    test("GET /api/certifications should return the default error message if the database query fails without a specific error message", async () => {
        (vi.spyOn(CertificationModel, 'find') as unknown as ReturnType<typeof vi.fn>).mockRejectedValue("");
        const response = await GET();
        const data: ApiGetResponse<CertificationType[]> = await response.json();
        if (!data.success) {
            expect(response.status).toBe(500);
            expect(data.success).toBe(false);
            expect(data.error).toBe("Failed to fetch certifications");
        }
    });


    test("POST /api/certifications should create a new certification", async () => {
        const newCertification = { title: "Certification 3", issuer: "Issuer 3", issueDate: "2023-03-01", expirationDate: "2024-03-01", credentialID: "789", credentialURL: "http://example.com", skillsCoverd: ["Skill 3"] };
        (vi.spyOn(CertificationModel, 'create') as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ _id: 'ghjghj', ...newCertification });
        const request = new NextRequest("http://localhost:3000/api/certifications", {
            method: 'POST',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(newCertification)
        });

        const response = await POST(request, { params: Promise.resolve({}) });
        const data = await response.json();
        expect(response.status).toBe(201);
        expect(data.success).toBe(true);
        expect(data.message).toBe("Certification created successfully");
    });

    test("POST /api/certifications should return an error if the request body is invalid", async () => {
        const invalidCertification = { title: "", issuer: "", issueDate: "", expirationDate: "", credentialID: "", credentialURL: "", skillsCoverd: [] };
        const request = new NextRequest("http://localhost:3000/api/certifications", {
            method: 'POST',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(invalidCertification)
        });

        const response = await POST(request, { params: Promise.resolve({}) });
        const data = await response.json();
        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Invalid request body");
        expect(Array.isArray(data.errors)).toBe(true);
    });

    test("POST /api/certifications should return an error if the request body is missing", async () => {
        const request = new NextRequest("http://localhost:3000/api/certifications", {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({})
        });

        const response = await POST(request, { params: Promise.resolve({}) });
        const data = await response.json();
        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Invalid request body");
        expect(Array.isArray(data.errors)).toBe(true);
    });

    test("POST /api/certifications should return an error if the request body is not JSON", async () => {
        const request = new NextRequest("http://localhost:3000/api/certifications", {
            method: 'POST',
            headers: {
                "Content-Type": "application/json"
            },
            body: "not a json"
        });

        const response = await POST(request, { params: Promise.resolve({}) });
        const data = await response.json();
        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
    });

    test("POST /api/certifications should return an error if the request body is missing required fields", async () => {
        const incompleteCertification = { title: "Incomplete Certification" };
        const request = new NextRequest("http://localhost:3000/api/certifications", {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(incompleteCertification)
        });

        const response = await POST(request, { params: Promise.resolve({}) });
        const data = await response.json();
        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Invalid request body");
        expect(Array.isArray(data.errors)).toBe(true);
    });


    test("POST /api/certifications should return a default error message if an unexpected error occurs", async () => {
        const newCertification = { title: "Certification 3", issuer: "Issuer 3", issueDate: "2023-03-01", expirationDate: "2024-03-01", credentialID: "789", credentialURL: "http://example.com", skillsCoverd: ["Skill 3"] };
        (vi.spyOn(CertificationModel, 'create') as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce('');
        const request = new NextRequest("http://localhost:3000/api/certifications", {
            method: 'POST',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(newCertification)
        });

        const response = await POST(request, { params: Promise.resolve({}) });
        const data: ApiGetResponse<CertificationType[]> = await response.json();
        if (!data.success) {
            expect(response.status).toBe(500);
            expect(data.success).toBe(false);
            expect(data.error).toBe("Failed to create certification");
        }
    });


    test("PUT should update a skill successfully", async () => {
        (vi.spyOn(CertificationModel, 'findByIdAndUpdate') as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockCertifications[0]);
        const request = new NextRequest(`http://localhost:3000/api/certifications/${mockCertifications[0]._id}`, {
            method: 'PUT',
            body: JSON.stringify({ title: 'Updated Certification' })
        });
        const response = await PUT(request, {
            params: Promise.resolve({ id: mockCertifications[0]._id as string })
        });
        const data: ApiPostResponse = await response.json();
        console.log(data);
        expect(data.success).toBe(true);
        if (data.success) {
            expect(data.message).toEqual('Certification updated successfully');
        }
    });


    test("PUT should return 404 if the certifcation is not found", async () => {
        (vi.spyOn(CertificationModel, 'findByIdAndUpdate') as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
        const request = new NextRequest(`http://localhost:3000/api/certifications/${mockCertifications[0]._id}`, {
            method: 'PUT',
            body: JSON.stringify({ name: 'Updated Skill' })
        });
        const response = await PUT(request, {
            params: Promise.resolve({ id: mockCertifications[0]._id as string })
        });
        const data: ApiPostResponse = await response.json();
        expect(data.success).toBe(false);
        if (!data.success) {
            expect(data.error).toEqual('Certification not found');
        }
    });

    test("PUT should return 400 if the certification data is invalid", async () => {
        (vi.spyOn(CertificationModel, 'findByIdAndUpdate') as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce("Certification not found");
        const request = new NextRequest(`http://localhost:3000/api/certifications/${mockCertifications[0]._id}`, {
            method: 'PUT',
            body: JSON.stringify({ title: '' }) // Invalid data
        });
        const response = await PUT(request, {
            params: Promise.resolve({ id: mockCertifications[0]._id as string })
        });
        const data: ApiPostResponse = await response.json();
        expect(data.success).toBe(false);
        if (!data.success) {
            expect(data.error).toEqual('Certification not found');
        }
    });

    test("PUT should return 400 if the certification id is invalid", async () => {
        (vi.spyOn(CertificationModel, 'findByIdAndUpdate') as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce("");
        const request = new NextRequest(`http://localhost:3000/api/certifications/sadfadsfasfsdaf`, {
            method: 'PUT',
            body: JSON.stringify({ title: '' }) // Invalid data
        });
        const response = await PUT(request, {
            params: Promise.resolve({ id: 'sadfadsfasfsdaf' })
        });
        const data: ApiPostResponse = await response.json();
        expect(data.success).toBe(false);
        if (!data.success) {
            expect(data.error).toEqual('Invalid certification ID');
        }
    });

    test("PUT should show the default error mesage if the error response is not returned", async () => {
        (vi.spyOn(CertificationModel, 'findByIdAndUpdate') as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce("");
        const request = new NextRequest(`http://localhost:3000/api/certifications/${mockCertifications[0]._id}`, {
            method: 'PUT',
            body: JSON.stringify({ title: '' }) // Invalid data
        });
        const response = await PUT(request, {
            params: Promise.resolve({ id: mockCertifications[0]._id as string })
        });
        const data: ApiPostResponse = await response.json();
        expect(data.success).toBe(false);
        if (!data.success) {
            expect(data.error).toEqual('Failed to parse request body');
        }
    });


    test("DELETE should delete a certification successfully", async () => {
        (vi.spyOn(CertificationModel, 'findByIdAndDelete') as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockCertifications[0]);
        const request = new NextRequest(`http://localhost:3000/api/certifications/${mockCertifications[0]._id}`, {
            method: 'DELETE'
        });
        const response = await DELETE(request, {
            params: Promise.resolve({ id: mockCertifications[0]._id as string })
        });
        const data: ApiPostResponse = await response.json();
        expect(data.success).toBe(true);
        if (data.success) {
            expect(data.message).toEqual('Certification deleted successfully');
        }
    });


    test("DELETE should return 400 if the certification id is invalid", async () => {
        (vi.spyOn(CertificationModel, 'findByIdAndDelete') as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce("");
        const request = new NextRequest(`http://localhost:3000/api/certifications/sadfadsfasfsdaf`, {
            method: 'DELETE'
        });
        const response = await DELETE(request, {
            params: Promise.resolve({ id: 'sadfadsfasfsdaf' })
        });
        const data: ApiPostResponse = await response.json();
        expect(data.success).toBe(false);
        if (!data.success) {
            expect(data.error).toEqual('Invalid certification ID');
        }
    });

    test("DELETE should return 400 if the certification data is invalid", async () => {
        (vi.spyOn(CertificationModel, 'findByIdAndDelete') as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce("Certification not found");
        const request = new NextRequest(`http://localhost:3000/api/certifications/${mockCertifications[0]._id}`, {
            method: 'DELETE'
        });
        const response = await DELETE(request, {
            params: Promise.resolve({ id: mockCertifications[0]._id as string })
        });
        const data: ApiPostResponse = await response.json();
        expect(data.success).toBe(false);
        if (!data.success) {
            expect(data.error).toEqual('Certification not found');
        }
    });

    test("DELETE should return 404 if the certification is not found", async () => {
        (vi.spyOn(CertificationModel, 'findByIdAndDelete') as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
        const request = new NextRequest(`http://localhost:3000/api/certifications/${mockCertifications[0]._id}`, {
            method: 'DELETE'
        });
        const response = await DELETE(request, {
            params: Promise.resolve({ id: mockCertifications[0]._id as string })
        });
        const data: ApiPostResponse = await response.json();
        expect(data.success).toBe(false);
        if (!data.success) {
            expect(data.error).toEqual('Certification not found');
        }
    });

    test("DELETE should show the default error mesage if the error response is not returned", async () => {
        (vi.spyOn(CertificationModel, 'findByIdAndDelete') as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce("");
        const request = new NextRequest(`http://localhost:3000/api/certifications/${mockCertifications[0]._id}`, {
            method: 'DELETE'
        });
        const response = await DELETE(request, {
            params: Promise.resolve({ id: mockCertifications[0]._id as string })
        });
        const data: ApiPostResponse = await response.json();
        expect(data.success).toBe(false);
        if (!data.success) {
            expect(data.error).toEqual('Failed to parse request body');
        }
    });
});