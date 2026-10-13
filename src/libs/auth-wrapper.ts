import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAccessToken } from "@/libs/jwt";

type RouteContext = {
    params: Promise<Record<string, string>>;
};

type AuthHandler<T = RouteContext> = (
    req: Request, 
    context: T & { user: unknown }
) => Promise<NextResponse>;

export function withAuth<T = RouteContext>(handler: AuthHandler<T>) {
    return async (req: Request, context: T) => {
        try {
            const cookieStore = await cookies();
            const accessToken = cookieStore.get("accessToken")?.value;
            if (!accessToken) {
                return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 });
            }
            
            const payload = await verifyAccessToken(accessToken);
            if (!payload) {
                return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 });
            }

            // Pass the context along with the verified user payload injected
            return await handler(req, { ...context, user: payload } as T & { user: unknown });
        } catch (error: Error | unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unauthorized';
            return NextResponse.json({ error: errorMessage, success: false }, { status: 401 });
        }
    };
}