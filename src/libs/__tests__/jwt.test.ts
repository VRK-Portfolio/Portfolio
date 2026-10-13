// @vitest-environment node
import { afterAll, afterEach, describe, expect, test, vi } from "vitest";
import { decodeJwt, decodeProtectedHeader, jwtVerify, SignJWT } from "jose";
import {
    signAccessToken,
    signRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
} from "../jwt";

vi.hoisted(() => {
    vi.stubEnv("JWT_SECRET", "test-only-access-signing-secret");
    vi.stubEnv("REFRESH_JWT_SECRET", "test-only-refresh-signing-secret");
});
vi.unmock("@/libs/jwt");

const tokenTypes = [
    {
        name: "access",
        sign: signAccessToken,
        verify: verifyAccessToken,
        secret: "test-only-access-signing-secret",
        expiresIn: 30 * 60,
    },
    {
        name: "refresh",
        sign: signRefreshToken,
        verify: verifyRefreshToken,
        secret: "test-only-refresh-signing-secret",
        expiresIn: 7 * 24 * 60 * 60,
    },
];

const payload = {
    userId: "507f1f77bcf86cd799439011",
    email: "admin@example.com",
    role: "admin",
};
const encodeSecret = (secret: string) => new TextEncoder().encode(secret);

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

afterAll(() => {
    vi.unstubAllEnvs();
});

describe.each(tokenTypes)("$name tokens", ({ sign, verify, secret, expiresIn }) => {
    test("signs an HS256 token with the expected payload and lifetime", async () => {
        const now = new Date("2026-01-01T00:00:00Z");
        vi.useFakeTimers();
        vi.setSystemTime(now);

        const token = await sign(payload);
        const claims = decodeJwt(token);
        const issuedAt = Math.floor(now.getTime() / 1000);

        expect(decodeProtectedHeader(token)).toEqual({ alg: "HS256" });
        expect(claims).toEqual({
            ...payload,
            iat: issuedAt,
            exp: issuedAt + expiresIn,
        });
        const verified = await jwtVerify(token, encodeSecret(secret), { algorithms: ["HS256"] });
        expect(verified.payload).toEqual(claims);
        expect(payload).toEqual({
            userId: "507f1f77bcf86cd799439011",
            email: "admin@example.com",
            role: "admin",
        });
    });

    test("verifies a valid token and returns its claims", async () => {
        const token = await sign(payload);

        expect(await verify(token)).toEqual(decodeJwt(token));
    });

    test("accepts a token just before expiration and rejects it at expiration", async () => {
        const now = new Date("2026-01-01T00:00:00Z");
        vi.useFakeTimers();
        vi.setSystemTime(now);
        const token = await sign(payload);
        const logger = vi.spyOn(console, "error").mockImplementation(() => {});

        vi.setSystemTime(now.getTime() + (expiresIn - 1) * 1000);
        expect(await verify(token)).toEqual(decodeJwt(token));
        expect(logger).not.toHaveBeenCalled();

        vi.setSystemTime(now.getTime() + expiresIn * 1000);
        expect(await verify(token)).toBeNull();
        expect(logger).toHaveBeenCalledExactlyOnceWith("Token verification failed:", expect.any(Error));
    });

    test.each(["", "not-a-jwt", "invalid.token.signature"])(
        "returns null and logs an error for malformed token %j",
        async (token) => {
            const logger = vi.spyOn(console, "error").mockImplementation(() => {});

            expect(await verify(token)).toBeNull();
            expect(logger).toHaveBeenCalledExactlyOnceWith("Token verification failed:", expect.any(Error));
        },
    );

    test("rejects a token signed with a different secret", async () => {
        const token = await new SignJWT(payload)
            .setProtectedHeader({ alg: "HS256" })
            .setExpirationTime("1h")
            .sign(encodeSecret("test-only-unrelated-secret"));
        const logger = vi.spyOn(console, "error").mockImplementation(() => {});

        expect(await verify(token)).toBeNull();
        expect(logger).toHaveBeenCalledExactlyOnceWith("Token verification failed:", expect.any(Error));
    });

    test("rejects a token whose payload was altered after signing", async () => {
        const token = await sign(payload);
        const [header, , signature] = token.split(".");
        const changedPayload = Buffer.from(JSON.stringify({
            ...decodeJwt(token),
            userId: "different-user",
        })).toString("base64url");
        const tamperedToken = `${header}.${changedPayload}.${signature}`;
        const logger = vi.spyOn(console, "error").mockImplementation(() => {});

        expect(await verify(tamperedToken)).toBeNull();
        expect(logger).toHaveBeenCalledExactlyOnceWith("Token verification failed:", expect.any(Error));
    });

    test("rejects algorithms other than HS256 even with the correct secret", async () => {
        const token = await new SignJWT(payload)
            .setProtectedHeader({ alg: "HS384" })
            .setExpirationTime("1h")
            .sign(encodeSecret(secret));
        const logger = vi.spyOn(console, "error").mockImplementation(() => {});

        expect(await verify(token)).toBeNull();
        expect(logger).toHaveBeenCalledExactlyOnceWith("Token verification failed:", expect.any(Error));
    });
});

describe("JWT secret configuration", () => {
    test("does not accept access and refresh tokens interchangeably", async () => {
        const accessToken = await signAccessToken(payload);
        const refreshToken = await signRefreshToken(payload);
        const logger = vi.spyOn(console, "error").mockImplementation(() => {});

        expect(await verifyAccessToken(refreshToken)).toBeNull();
        expect(await verifyRefreshToken(accessToken)).toBeNull();
        expect(logger).toHaveBeenCalledTimes(2);
        expect(logger).toHaveBeenNthCalledWith(1, "Token verification failed:", expect.any(Error));
        expect(logger).toHaveBeenNthCalledWith(2, "Token verification failed:", expect.any(Error));
    });

    test.each([
        ["JWT_SECRET", undefined],
        ["REFRESH_JWT_SECRET", undefined],
        ["JWT_SECRET", ""],
        ["REFRESH_JWT_SECRET", ""],
    ])("rejects module initialization when %s is %j", async (name, value) => {
        const originalValue = process.env[name];
        vi.resetModules();
        vi.stubEnv(name, value);

        try {
            await expect(import("../jwt")).rejects.toThrow(
                "JWT secret keys must be defined in environment variables",
            );
        } finally {
            vi.stubEnv(name, originalValue);
            vi.resetModules();
        }
    });
});
