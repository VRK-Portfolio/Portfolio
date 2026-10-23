import { beforeEach, describe, expect, test, vi } from "vitest";
import { POST } from "../route";

const mocks = vi.hoisted(() => ({
    connectDB: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    compare: vi.fn(),
    signAccessToken: vi.fn(),
    signRefreshToken: vi.fn(),
    cookies: vi.fn(),
    setCookie: vi.fn(),
}));

vi.mock("@/libs/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/models/auth.model", () => ({
    AuthModel: { findOne: mocks.findOne, find: mocks.find },
}));
vi.mock("bcryptjs", () => ({ default: { compare: mocks.compare } }));
vi.mock("@/libs/jwt", () => ({
    signAccessToken: mocks.signAccessToken,
    signRefreshToken: mocks.signRefreshToken,
}));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));

describe("authRoute POST", () => {
    const validCredentials = {
        email: "admin@example.com",
        password: "password123",
    };
    const user = {
        _id: "507f1f77bcf86cd799439011",
        email: validCredentials.email,
        password: "hashed-password",
    };

    const createRequest = (body: unknown) => new Request("http://localhost:3000/api/auth", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
    });

    const expectNoTokensOrCookies = () => {
        expect(mocks.signAccessToken).not.toHaveBeenCalled();
        expect(mocks.signRefreshToken).not.toHaveBeenCalled();
        expect(mocks.cookies).not.toHaveBeenCalled();
        expect(mocks.setCookie).not.toHaveBeenCalled();
    };

    beforeEach(() => {
        vi.resetAllMocks();
        mocks.connectDB.mockResolvedValue(undefined);
        mocks.findOne.mockResolvedValue(user);
        mocks.find.mockResolvedValue([]);
        mocks.compare.mockResolvedValue(true);
        mocks.signAccessToken.mockResolvedValue("test-access-token");
        mocks.signRefreshToken.mockResolvedValue("test-refresh-token");
        mocks.cookies.mockResolvedValue({ set: mocks.setCookie });
    });

    test.each([
        {},
        { email: validCredentials.email },
        { password: validCredentials.password },
        { ...validCredentials, email: "" },
        { ...validCredentials, password: "" },
    ])("returns 400 when credentials are missing or empty: %j", async (credentials) => {
        const response = await POST(createRequest(credentials));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            error: "Email and password are required",
            success: false,
        });
        expect(mocks.connectDB).not.toHaveBeenCalled();
        expect(mocks.findOne).not.toHaveBeenCalled();
        expect(mocks.compare).not.toHaveBeenCalled();
        expectNoTokensOrCookies();
    });

    test("returns 401 when the email does not match a user", async () => {
        mocks.findOne.mockResolvedValueOnce(null);

        const response = await POST(createRequest(validCredentials));

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({
            error: "Invalid E-Mail Address",
            success: false,
        });
        expect(mocks.connectDB).toHaveBeenCalledOnce();
        expect(mocks.findOne).toHaveBeenCalledExactlyOnceWith({ email: validCredentials.email });
        expect(mocks.compare).not.toHaveBeenCalled();
        expectNoTokensOrCookies();
    });

    test("returns 401 when the password is incorrect", async () => {
        mocks.compare.mockResolvedValueOnce(false);

        const response = await POST(createRequest(validCredentials));

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({
            error: "Invalid Password",
            success: false,
        });
        expect(mocks.compare).toHaveBeenCalledExactlyOnceWith(validCredentials.password, user.password);
        expectNoTokensOrCookies();
    });

    test("returns 200 and sets both token cookies for valid credentials", async () => {
        const response = await POST(createRequest(validCredentials));

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            message: "Logged in successfully",
            success: true,
        });
        expect(mocks.connectDB).toHaveBeenCalledOnce();
        expect(mocks.findOne).toHaveBeenCalledExactlyOnceWith({ email: validCredentials.email });
        expect(mocks.compare).toHaveBeenCalledExactlyOnceWith(validCredentials.password, user.password);
        const payload = { userId: user._id, email: user.email };
        expect(mocks.signAccessToken).toHaveBeenCalledExactlyOnceWith(payload);
        expect(mocks.signRefreshToken).toHaveBeenCalledExactlyOnceWith(payload);
        expect(mocks.cookies).toHaveBeenCalledOnce();
        expect(mocks.setCookie).toHaveBeenCalledTimes(2);
        expect(mocks.setCookie).toHaveBeenNthCalledWith(1, "accessToken", "test-access-token", {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            maxAge: 15 * 60,
            path: "/",
        });
        expect(mocks.setCookie).toHaveBeenNthCalledWith(2, "refreshToken", "test-refresh-token", {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60,
            path: "/",
        });
    });

    test.each([
        ["database connection", mocks.connectDB],
        ["user lookup", mocks.findOne],
        ["user list lookup", mocks.find],
        ["password comparison", mocks.compare],
    ])("returns 500 when %s fails", async (_, dependency) => {
        dependency.mockRejectedValueOnce(new Error("Authentication dependency failed"));

        const response = await POST(createRequest(validCredentials));

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({
            error: "Authentication dependency failed",
            success: false,
        });
        expectNoTokensOrCookies();
    });

    test.each([
        ["access token", mocks.signAccessToken],
        ["refresh token", mocks.signRefreshToken],
    ])("returns 500 without setting cookies when signing the %s fails", async (_, dependency) => {
        dependency.mockRejectedValueOnce(new Error("Token signing failed"));

        const response = await POST(createRequest(validCredentials));

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: "Token signing failed", success: false });
        expect(mocks.cookies).not.toHaveBeenCalled();
        expect(mocks.setCookie).not.toHaveBeenCalled();
    });

    test("returns 500 when the cookie store is unavailable", async () => {
        mocks.cookies.mockRejectedValueOnce(new Error("Cookie store unavailable"));

        const response = await POST(createRequest(validCredentials));

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: "Cookie store unavailable", success: false });
        expect(mocks.setCookie).not.toHaveBeenCalled();
    });

    test("returns 500 when setting a cookie fails", async () => {
        mocks.setCookie.mockImplementationOnce(() => {
            throw new Error("Cookie write failed");
        });

        const response = await POST(createRequest(validCredentials));

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: "Cookie write failed", success: false });
        expect(mocks.setCookie).toHaveBeenCalledTimes(1);
    });

    test("returns 500 when parsing the request fails", async () => {
        const request = createRequest(validCredentials);
        vi.spyOn(request, "json").mockRejectedValueOnce(new SyntaxError("Invalid JSON"));

        const response = await POST(request);

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: "Invalid JSON", success: false });
        expect(mocks.connectDB).not.toHaveBeenCalled();
        expectNoTokensOrCookies();
    });

    test("converts non-Error exceptions into a 500 response", async () => {
        mocks.connectDB.mockRejectedValueOnce("Connection failed");

        const response = await POST(createRequest(validCredentials));

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: "Connection failed", success: false });
        expectNoTokensOrCookies();
    });
});
