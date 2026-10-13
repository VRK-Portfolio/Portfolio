import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { withAuth } from "../auth-wrapper";
import { verifyAccessToken } from "@/libs/jwt";

vi.mock("@/libs/jwt", () => ({
    verifyAccessToken: vi.fn()
}));
describe("withAuth", () => {

    const mockHandler = vi.fn(async() => {
        return NextResponse.json({ success: true, data: [] }, { status: 200 });
    })

   
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test("should return unauthorized if no access token is provided", async () => {
        vi.mocked(cookies).mockResolvedValueOnce({
            get: vi.fn().mockReturnValue(undefined)
        }as unknown as Awaited<ReturnType<typeof cookies>>);

        const wrappedHandler = withAuth(mockHandler);
        const request = new Request("http://localhost:3000/api/test");
        const response = await wrappedHandler(request, {params: Promise.resolve({})});
        const json = await response.json();
        expect(response.status).toBe(401);
        expect(json).toEqual({ success: false, error: "Unauthorized" });
        expect(mockHandler).not.toHaveBeenCalled();
    });

    test("should return unauthorised if payload is invalid", async () => {
        vi.mocked(cookies).mockResolvedValueOnce({
            get: vi.fn().mockReturnValue("invalid-token")
        }as unknown as Awaited<ReturnType<typeof cookies>>);

        const wrappedHandler = withAuth(mockHandler);
        const request = new Request("http://localhost:3000/api/test");
        const response = await wrappedHandler(request, {params: Promise.resolve({})});
        const json = await response.json();
        expect(response.status).toBe(401);
        expect(json).toEqual({ success: false, error: "Unauthorized" });
        expect(mockHandler).not.toHaveBeenCalled();
    });

    test("should call the handler if a valid access token is provided", async () => {
        vi.mocked(cookies).mockResolvedValueOnce({
            get: vi.fn().mockReturnValue({value: "mock-valid-token"})
        }as unknown as Awaited<ReturnType<typeof cookies>>);
        vi.mocked(verifyAccessToken).mockResolvedValueOnce({ userId: "mock-user-id" });
        const wrappedHandler = withAuth(mockHandler);
        const request = new Request("http://localhost:3000/api/test");
        const response = await wrappedHandler(request, {params: Promise.resolve({})});
        const json = await response.json();
        expect(response.status).toBe(200);
        expect(json).toEqual({ success: true, data: [] });
        expect(mockHandler).toHaveBeenCalled();
    });
test("should return 401 if verifyAccessToken returns a falsy payload", async () => {
        vi.mocked(cookies).mockResolvedValueOnce({
            get: vi.fn().mockReturnValue({ value: "valid-token" }),
        } as unknown as Awaited<ReturnType<typeof cookies>>);
        vi.mocked(verifyAccessToken).mockResolvedValueOnce(null);

        const wrappedHandler = withAuth(mockHandler);
        const request = new Request("http://localhost:3000/api/test");
        const response = await wrappedHandler(request, { params: Promise.resolve({}) });
        const json = await response.json();

        expect(response.status).toBe(401);
        expect(json).toEqual({ error: "Unauthorized", success: false });
        expect(mockHandler).not.toHaveBeenCalled();
    });

    test("should handle non-Error thrown types gracefully in catch block", async () => {
        vi.mocked(cookies).mockResolvedValueOnce({
            get: vi.fn().mockReturnValue({ value: "valid-token" }),
        } as unknown as Awaited<ReturnType<typeof cookies>>);
        vi.mocked(verifyAccessToken).mockRejectedValueOnce("String error message");

        const wrappedHandler = withAuth(mockHandler);
        const request = new Request("http://localhost:3000/api/test");
        const response = await wrappedHandler(request, { params: Promise.resolve({}) });
        const json = await response.json();

        expect(response.status).toBe(401);
        expect(json).toEqual({ error: "Unauthorized", success: false });
        expect(mockHandler).not.toHaveBeenCalled();
    });

        test("should handle non-Error thrown types gracefully in catch block", async () => {
        vi.mocked(cookies).mockResolvedValueOnce({
            get: vi.fn().mockReturnValue({ value: "valid-token" }),
        } as unknown as Awaited<ReturnType<typeof cookies>>);
        vi.mocked(verifyAccessToken).mockRejectedValueOnce(new Error("Error message"));

        const wrappedHandler = withAuth(mockHandler);
        const request = new Request("http://localhost:3000/api/test");
        const response = await wrappedHandler(request, { params: Promise.resolve({}) });
        const json = await response.json();

        expect(response.status).toBe(401);
        expect(json).toEqual({ error: "Error message", success: false });
        expect(mockHandler).not.toHaveBeenCalled();
    });

});