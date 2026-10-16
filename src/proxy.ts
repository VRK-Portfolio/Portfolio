import { NextRequest, NextResponse } from "next/server";

const protectedRoutes = ["/admin"];
const authRoutes = ["/login"];
export function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;

    const accessToken = req.cookies.get("accessToken");
    const isAuthenticated = Boolean(accessToken);

    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
    const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

    if(isProtectedRoute && !isAuthenticated) {
        return NextResponse.redirect(new URL("/login", req.url));
    }
    if(isAuthRoute && isAuthenticated) {
        return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }

    return NextResponse.next();
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
};
