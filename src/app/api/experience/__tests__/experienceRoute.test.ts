import { cookies } from "next/headers";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { Experience } from "@/models/experience.model";
import { GET, POST } from "../route";
import { DELETE, PUT } from "../[id]/route";

const { connectDB } = vi.hoisted(() => ({ connectDB: vi.fn() }));
vi.mock("@/libs/db", () => ({ connectDB }));

const experience = {
    company: "Example Company",
    location: "Remote",
    responsibilites: ["Architecture"],
    positions: [{
        role: "Engineer",
        startDate: "2024-02-29",
        isCurrentPosition: true,
        description: "Building accessible applications.",
    }],
};
const validId = "507f1f77bcf86cd799439011";
const context = (id = validId) => ({ params: Promise.resolve({ id }) });
const request = (method: string, body?: unknown) => new Request("http://localhost:3000/api/experience", {
    method,
    ...(body === undefined ? {} : {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    }),
});

describe("Experience API routes", () => {
    beforeEach(() => {
        connectDB.mockReset();
        connectDB.mockResolvedValue(undefined);
    });
    afterEach(() => vi.restoreAllMocks());

    test("GET connects before querying and returns an empty list", async () => {
        const find = vi.spyOn(Experience, "find");
        const response = await GET();
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            success: true, data: [], message: "Experience fetched successfully",
        });
        expect(connectDB).toHaveBeenCalledTimes(1);
        expect(connectDB.mock.invocationCallOrder[0]).toBeLessThan(find.mock.invocationCallOrder[0]);
    });

    test("POST creates an experience with typed dates and GET returns serialized dates", async () => {
        const response = await POST(request("POST", experience), context());
        expect(response.status).toBe(201);
        expect(await response.json()).toEqual({ success: true, message: "Experience created successfully" });
        const saved = await Experience.findOne({ company: experience.company }).orFail();
        expect(saved.positions[0].startDate).toEqual(new Date("2024-02-29"));

        const fetched = await GET();
        const body = await fetched.json();
        expect(body.data).toHaveLength(1);
        expect(body.data[0]).toMatchObject({
            company: experience.company,
            positions: [{ ...experience.positions[0], startDate: "2024-02-29T00:00:00.000Z" }],
        });
    });

    test("POST rejects invalid nested fields without writing to the database", async () => {
        const response = await POST(request("POST", {
            ...experience, positions: [{ ...experience.positions[0], startDate: "invalid" }],
        }), context());
        expect(response.status).toBe(400);
        expect(await response.json()).toMatchObject({
            success: false,
            error: "Invalid data",
            errors: [{ field: "positions.0.startDate" }],
        });
        expect(connectDB).not.toHaveBeenCalled();
        expect(await Experience.countDocuments()).toBe(0);
    });

    test("PUT updates the selected record and preserves nested position IDs", async () => {
        const saved = await Experience.create(experience);
        const body = {
            ...experience,
            company: "Updated Company",
            positions: [{
                ...experience.positions[0],
                _id: String(saved.positions[0]._id),
                endDate: "2025-01-31",
                isCurrentPosition: false,
            }],
        };
        const response = await PUT(request("PUT", body), context(String(saved._id)));
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ success: true, message: "Experience updated successfully" });
        const updated = await Experience.findById(saved._id).orFail();
        expect(updated.company).toBe("Updated Company");
        expect(String(updated.positions[0]._id)).toBe(String(saved.positions[0]._id));
        expect(updated.positions[0].endDate).toEqual(new Date("2025-01-31"));
    });

    test("PUT rejects invalid data without modifying the stored experience", async () => {
        const saved = await Experience.create(experience);
        const response = await PUT(request("PUT", { ...experience, positions: "invalid" }), context(String(saved._id)));
        expect(response.status).toBe(400);
        expect(await response.json()).toMatchObject({
            success: false, error: "Invalid request body", errors: [{ field: "positions" }],
        });
        expect((await Experience.findById(saved._id).orFail()).company).toBe(experience.company);
    });

    test("DELETE removes the selected record", async () => {
        const saved = await Experience.create(experience);
        const response = await DELETE(request("DELETE"), context(String(saved._id)));
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ success: true, message: "Experience deleted successfully" });
        expect(await Experience.findById(saved._id)).toBeNull();
    });

    describe.each(["PUT", "DELETE"] as const)("%s", (method) => {
        const call = (id: string) => method === "PUT"
            ? PUT(request(method, experience), context(id))
            : DELETE(request(method), context(id));

        test.each([
            { id: "", message: "ID is required" },
            { id: "invalid", message: "Invalid ID" },
        ])("rejects '$id' before accessing the database", async ({ id, message }) => {
            const response = await call(id);
            expect(response.status).toBe(400);
            expect(await response.json()).toEqual({ success: false, error: message });
            expect(connectDB).not.toHaveBeenCalled();
        });

        test("returns 404 for an unknown record", async () => {
            const response = await call(validId);
            expect(response.status).toBe(404);
            expect(await response.json()).toEqual({ success: false, error: "Experience not found" });
        });

        test.each([
            { error: new Error("Database unavailable"), message: "Database unavailable" },
            { error: "Database unavailable", message: "Unknown error" },
        ])("reports database failures: $message", async ({ error, message }) => {
            const operation = method === "PUT" ? "findByIdAndUpdate" : "findByIdAndDelete";
            vi.spyOn(Experience, operation).mockRejectedValueOnce(error);
            const response = await call(validId);
            expect(response.status).toBe(500);
            expect(await response.json()).toEqual({ success: false, error: message });
        });
    });

    test.each([
        { error: new Error("Database unavailable"), message: "Database unavailable" },
        { error: "Database unavailable", message: "Something went wrong!" },
    ])("GET exposes database failures: $message", async ({ error, message }) => {
        vi.spyOn(Experience, "find").mockRejectedValueOnce(error);
        const response = await GET();
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ success: false, error: message });
    });

    test.each([
        { error: new Error("Save failed"), message: "Save failed" },
        { error: "Save failed", message: "Something went wrong!" },
    ])("POST exposes save failures: $message", async ({ error, message }) => {
        vi.spyOn(Experience.prototype, "save").mockRejectedValueOnce(error);
        const response = await POST(request("POST", experience), context());
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ success: false, error: message });
    });

    test.each(["POST", "PUT"] as const)("%s reports malformed JSON without saving", async (method) => {
        const invalidRequest = new Request("http://localhost:3000/api/experience", {
            method, headers: { "Content-Type": "application/json" }, body: "{",
        });
        const response = await (method === "POST" ? POST : PUT)(invalidRequest, context());
        expect(response.status).toBe(500);
        expect(await response.json()).toMatchObject({ success: false, error: expect.any(String) });
        expect(await Experience.countDocuments()).toBe(0);
    });

    test.each(["POST", "PUT", "DELETE"] as const)("%s requires authentication before accessing the database", async (method) => {
        const store = await cookies();
        vi.spyOn(store, "get").mockReturnValue(undefined);
        const handler = method === "POST" ? POST : method === "PUT" ? PUT : DELETE;
        const response = await handler(request(method, method === "DELETE" ? undefined : experience), context());
        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ success: false, error: "Unauthorized" });
        expect(connectDB).not.toHaveBeenCalled();
    });
});
