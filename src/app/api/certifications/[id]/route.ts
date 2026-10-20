import { ApiPostResponse } from "@/@types/ApiResponse.types";
import { CertificationType } from "@/@types/Certification.types";
import { withAuth } from "@/libs/auth-wrapper";
import { connectDB } from "@/libs/db";
import { CertificationModel } from "@/models/certifications.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

interface RouteContext {
    params: Promise<{
        id: string;
    }>;
}

export const PUT = withAuth(async (request: Request, context: RouteContext): Promise<NextResponse<ApiPostResponse>> => { 
    try {
        const { id } = await context.params;

        if(mongoose.Types.ObjectId.isValid(id) === false) {
            return NextResponse.json({
                success: false,
                error: 'Invalid certification ID'
            }, { status: 400 });
        }
        await connectDB();
        const body = await request.json();
        const certification = await CertificationModel.findByIdAndUpdate<CertificationType>(id, body, { returnDocument: 'after' });
        if (!certification) {
            return NextResponse.json({
                success: false,
                error: 'Certification not found'
            }, { status: 404 });
        }
        return NextResponse.json({ success: true, message: "Certification updated successfully" });

    } catch (error: Error | unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        return NextResponse.json({ success: false, error: err.message || "Failed to parse request body" });
    }

});


export const DELETE = withAuth(async (request: Request, context: RouteContext): Promise<NextResponse<ApiPostResponse>> => {
    try {
        const { id } = await context.params;

        if(mongoose.Types.ObjectId.isValid(id) === false) {
            return NextResponse.json({
                success: false,
                error: 'Invalid certification ID'
            }, { status: 400 });
        }
        await connectDB();
        const certification = await CertificationModel.findByIdAndDelete(id);
        if (!certification) {
            return NextResponse.json({
                success: false,
                error: 'Certification not found'
            }, { status: 404 });
        }
        return NextResponse.json({ success: true, message: "Certification deleted successfully" });

    } catch (error: Error | unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        return NextResponse.json({ success: false, error: err.message || "Failed to parse request body" });
    }
});