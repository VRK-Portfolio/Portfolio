import { connectDB } from "@/libs/db";
import { signAccessToken, signRefreshToken } from "@/libs/jwt";
import { AuthModel } from "@/models/auth.model";
import { AuthTypeSchema } from "@/@types/Auth.types";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const reqData = AuthTypeSchema.safeParse(await request.json());
        const {email, password} = reqData.data || {};

        if(!email || !password) {
            return NextResponse.json({ error: "Email and password are required", success: false }, { status: 400 });
        }

        await connectDB();
        const user = await AuthModel.findOne({ email });
        const getList = await AuthModel.find();
        console.log(getList);
        if(!user) {
            return NextResponse.json({ error: "Invalid E-Mail Address", success: false }, { status: 401 });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if(!isPasswordValid) {
            return NextResponse.json({ error: "Invalid Password", success: false }, { status: 401 });
        }
        const tokenPayload = { userId: user._id, email: user.email };
        const accessToken = await signAccessToken(tokenPayload);
        const refreshToken = await signRefreshToken(tokenPayload);

        const cookieStore = await cookies();

        cookieStore.set("accessToken", accessToken, { httpOnly: true, secure: true, sameSite: "strict", maxAge: 15 * 60, path: '/' });
        cookieStore.set("refreshToken", refreshToken, { httpOnly: true, secure: true, sameSite: "strict", maxAge: 7 * 24 * 60 * 60, path: '/' });

        return NextResponse.json({ message: "Logged in successfully", success: true }, { status: 200 });

    } catch (error: Error | unknown) {
        const err = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: err, success: false }, { status: 500 });
    }
}