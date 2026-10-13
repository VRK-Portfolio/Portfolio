import { BasicInfoType } from "@/@types/BasicInfo.types";
import { BasicInfoModel } from "@/models/basic-info.model";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { connectDB } from "@/libs/db";
import { GET, POST } from "../route";
import { ApiGetResponse, ApiPostResponse } from "@/@types/ApiResponse.types";
import { NextRequest } from "next/server";

describe("BasicInfo API Route", () => {
    beforeEach(async () => {
        vi.restoreAllMocks();

        // 👈 Guarantees Mongoose connection is ready before model operations run
        await connectDB();
    });
    const validData: BasicInfoType = {
        name: "John Doe",
        email: "john.doe@example.com",
        phone: "9123456780",
        address: "123 Main St, Anytown, USA",
        website_url: "https://johndoe.com",
        about_me: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since 1966, when designers at Letraset and James Mosley, the librarian at St Bride Printing Library in London, took a 1914 Cicero translation and scrambled it to make dummy text for Letraset's Body Type sheets. It has survived not only many decades, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised thanks to these sheets and more recently with desktop publishing software like Aldus PageMaker and Microsoft Word including versions of Lorem Ipsum.",
        avatar_url: "https://example.com/avatar.jpg",
        bio: "Full-stack developr",
        favicon_url: "https://example.com/favicon.ico",
        github_url: "https://github.com/johndoe",
        linked_in_url: "https://linkedin.com/in/johndoe",
        created_at: new Date(),
        updated_at: new Date(),
    }
    describe("GET /api/basic-info", () => {
        test("should return the basic info", async () => {
            await BasicInfoModel.create(validData);
            const response = await GET();
            const json: ApiGetResponse<BasicInfoType[]> = await response.json();
            expect(json.success).toBe(true);
            if (json.success) {
                expect(json.message).toBeDefined();
                expect(json.data[0].name).toEqual(validData.name);
                expect(json.data[0].about_me).toEqual(validData.about_me);
            }
        });

        test("should return an empty array if no basic info exists", async () => {
            const response = await GET();
            const json: ApiGetResponse<BasicInfoType[]> = await response.json();
            expect(json.success).toBe(true);
            if (json.success) {
                expect(json.message).toBeDefined();
                expect(json.data).toEqual([]);
            }
        });

        test("should return a error on 500", async () => {
            vi.spyOn(BasicInfoModel, "find").mockRejectedValueOnce(new Error("Internal Server Error"));
            const response = await GET();
            const json: ApiGetResponse<BasicInfoType[]> = await response.json();
            expect(json.success).toBe(false);
            if (!json.success) {
                expect(json.error).toBeDefined();
                expect(json.error).toEqual("Internal Server Error");
            }
        });

        test("should return a 200 status code", async () => {
            const response = await GET();
            expect(response.status).toBe(200);
        });

        test("should return a 500 status code on internal server error", async () => {
            vi.spyOn(BasicInfoModel, "find").mockImplementationOnce(() => {
                throw new Error("Internal Server Error");
            });
            const response = await GET();
            const json: ApiGetResponse<BasicInfoType[]> = await response.json();
            expect(response.status).toBe(500);
            expect(json.success).toBe(false);
            if (!json.success) {
                expect(json.error).toBeDefined();
            }
        });

        test("should handle non-Error thrown types gracefully", async () => {
            (vi.spyOn(BasicInfoModel, 'find') as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce("Database connection lost");
            const response = await GET();
            const data: ApiPostResponse = await response.json();
            expect(response.status).toBe(500);
            expect(data.success).toBe(false);
            if (!data.success) {
                expect(data.error).toEqual('Database connection lost');
            }
        });

        test("should handle non-Error thrown types gracefully", async () => {
            (vi.spyOn(BasicInfoModel, 'find') as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce('');
            const response = await GET();
            const data: ApiPostResponse = await response.json();
            expect(response.status).toBe(500);
            expect(data.success).toBe(false);
            if (!data.success) {
                expect(data.error).toEqual('Failed to fetch basic info');
            }
        });
    });

    describe("POST /api/basic-info", () => {
        beforeEach(() => {
            vi.restoreAllMocks();
        })
        test("should return 422 for invalid request body", async () => {
            const request = new Request("http://localhost:3000/api/basic-info", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Cookie": "accessToken=mock-valid-token",
                },
                body: JSON.stringify({}),
            });
            const response = await POST(request, { params: Promise.resolve({}) });
            const json: ApiPostResponse = await response.json();
            expect(response.status).toBe(422);
            expect(json.success).toBe(false);
            if (!json.success) {
                expect(json.error).toBeDefined();
            }
        });

        test("should return 201 for valid request body", async () => {
            const request = new Request("http://localhost:3000/api/basic-info", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Cookie": "accessToken=mock-valid-token", // 👈 Add this
                },
                body: JSON.stringify(validData),
            });
            const response = await POST(request, { params: Promise.resolve({}) });
            const json: ApiPostResponse = await response.json();
            if (!json.success) {
                // If validation fails, this prints the exact Zod errors in test output
                console.error("Zod Validation Issues:", json.errors);
            }
            expect(response.status).toBe(201);
            expect(json.success).toBe(true);
        });

        test("should return 500 for server error", async () => {
            vi.spyOn(BasicInfoModel, "findOneAndUpdate").mockImplementationOnce(() => {
                throw new Error("Internal Server Error");
            });
            const request = new Request("http://localhost:3000/api/basic-info", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Cookie": "accessToken=mock-valid-token", // 👈 Add this
                },
                body: JSON.stringify(validData),
            });
            const response = await POST(request, { params: Promise.resolve({}) });
            const json: ApiPostResponse = await response.json();
            expect(response.status).toBe(500);
            expect(json.success).toBe(false);
            if (!json.success) {
                expect(json.error).toBeDefined();
            }
        });

        test("should show the default error message on 500 server error", async () => {
            vi.spyOn(BasicInfoModel, "findOneAndUpdate").mockImplementationOnce(() => {
                throw new Error();
            });
            const request = new Request("http://localhost:3000/api/basic-info", {
                method: "POST",
                body: JSON.stringify(validData),
            });
            const response = await POST(request, { params: Promise.resolve({}) });
            const json: ApiPostResponse = await response.json();
            expect(response.status).toBe(500);
            expect(json.success).toBe(false);
            if (!json.success) {
                expect(json.error).toBeDefined();
            }
        });

        test("should handle non-Error thrown types gracefully", async () => {
            (vi.spyOn(BasicInfoModel, 'findOneAndUpdate') as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce("Database connection lost");

            const request = new NextRequest('http://localhost:3000/api/basic-info', {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(validData)
            });
            const response = await POST(request, { params: Promise.resolve({}) });
            const data: ApiPostResponse = await response.json();
            expect(data.success).toBe(false);
            if (!data.success) {
                expect(data.error).toEqual('Database connection lost');
            }
        });
    });
});