import { jwtVerify, SignJWT } from "jose";


const accessSecretKey = new TextEncoder().encode(process.env.JWT_SECRET);
const refreshSecretKey = new TextEncoder().encode(process.env.REFRESH_JWT_SECRET);


if (!process.env.JWT_SECRET || !process.env.REFRESH_JWT_SECRET) {
    throw new Error('JWT secret keys must be defined in environment variables');
}

export async function signAccessToken(payload: Record<string, unknown>): Promise<string> {
    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("0.5h")
        .sign(accessSecretKey);
}


export async function signRefreshToken(payload: Record<string, unknown>): Promise<string> {
    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(refreshSecretKey);
}


export async function verifyAccessToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, accessSecretKey, {
            algorithms: ["HS256"]
        });
        return payload;
    } catch (error) {
        console.error("Token verification failed:", error);
        return null;
    }
}

export async function verifyRefreshToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, refreshSecretKey, {
            algorithms: ["HS256"]
        });
        return payload;
    } catch (error) {
        console.error("Token verification failed:", error);
        return null;
    }
}