import { beforeEach, describe, expect, test, vi } from "vitest";
import { cookies } from "next/headers";
import { DEFAULT_CHAT_CONFIG } from "@/@types/ChatSettings.types";
import { GET, PUT } from "../route";
import { GET as visibility } from "../../chat/visibility/route";

const mocks = vi.hoisted(() => ({ get: vi.fn(), save: vi.fn(), publicSettings: vi.fn() }));
vi.mock("@/libs/chat-settings", () => ({
    getChatSettings: mocks.get, saveChatSettings: mocks.save, getPublicChatSettings: mocks.publicSettings,
}));
const context = { params: Promise.resolve({}) };
const view = { ...DEFAULT_CHAT_CONFIG, hasApiKey: true };
const request = (body: unknown, origin = "http://localhost") => new Request("http://localhost/api/chat-settings", {
    method: "PUT", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body),
});

beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue(view);
    mocks.save.mockResolvedValue(view);
    mocks.publicSettings.mockResolvedValue({ provider: "groq", model: "llama-3.3-70b-versatile", chatEnabled: false });
    vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("Authenticated chat settings and public visibility", () => {
    test("returns the safe view without caching and saves valid settings", async () => {
        const response = await GET(new Request("http://localhost/api/chat-settings"), context);
        expect(response.status).toBe(200);
        expect(response.headers.get("Cache-Control")).toBe("no-store");
        expect(await response.json()).toEqual({ success: true, data: view });
        expect((await PUT(request(DEFAULT_CHAT_CONFIG), context)).status).toBe(200);
        expect(mocks.save).toHaveBeenCalledWith(DEFAULT_CHAT_CONFIG);
    });

    test("requires authentication for reads and writes", async () => {
        vi.mocked(cookies).mockResolvedValueOnce({ get: () => undefined } as Awaited<ReturnType<typeof cookies>>);
        expect((await GET(new Request("http://localhost/api/chat-settings"), context)).status).toBe(401);
        vi.mocked(cookies).mockResolvedValueOnce({ get: () => undefined } as Awaited<ReturnType<typeof cookies>>);
        expect((await PUT(request(DEFAULT_CHAT_CONFIG), context)).status).toBe(401);
        expect(mocks.save).not.toHaveBeenCalled();
    });

    test("rejects cross-origin writes and invalid configuration", async () => {
        expect((await PUT(request(DEFAULT_CHAT_CONFIG, "https://other.example"), context)).status).toBe(403);
        expect((await PUT(request({ ...DEFAULT_CHAT_CONFIG, maxOutputTokens: -1 }), context)).status).toBe(422);
        expect(mocks.save).not.toHaveBeenCalled();
    });

    test("does not reflect secrets from persistence errors", async () => {
        mocks.save.mockRejectedValue(new Error("database failed: private-key"));
        const response = await PUT(request(DEFAULT_CHAT_CONFIG), context);
        expect(response.status).toBe(500);
        expect(JSON.stringify(await response.json())).not.toContain("private-key");
        expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("private-key");
    });

    test("public visibility reveals only visibility, provider, and model, and reports failures", async () => {
        const response = await visibility();
        expect(await response.json()).toEqual({ success: true, chatEnabled: false, provider: "groq", model: "llama-3.3-70b-versatile" });
        expect(response.headers.get("Cache-Control")).toBe("no-store");
        mocks.publicSettings.mockRejectedValue(new Error("database down"));
        expect((await visibility()).status).toBe(500);
    });
});
