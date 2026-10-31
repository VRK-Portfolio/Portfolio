import { ApiPostResponse } from "@/@types/ApiResponse.types";
import { ExperiencePropsSchema, ExperienceType } from "@/@types/Experience.types";
import { withAuth } from "@/libs/auth-wrapper";
import { connectDB } from "@/libs/db";
import { Experience } from "@/models/experience.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export const PUT = withAuth(async (request: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse<ApiPostResponse>> => {
    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: "ID is required", success: false }, { status: 400 });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid ID", success: false }, { status: 400 });
        }

        await connectDB();
        const body: ExperienceType = await request.json();
        const isValid = ExperiencePropsSchema.safeParse(body);
        if (!isValid.success) {
            return NextResponse.json({ error: "Invalid request body", errors: isValid.error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })), success: false }, { status: 400 });
        }
        if (!body) {
            return NextResponse.json({ error: "Request body is required", success: false }, { status: 400 });
        }

        const experience = await Experience.findByIdAndUpdate(id, body, { new: true });
        if (!experience) {
            return NextResponse.json({ error: "Experience not found", success: false }, { status: 404 });
        }
        return NextResponse.json({ success: true, message: 'Experience updated successfully' }, { status: 200 });


    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : new Error(String("Unknown error")).message;
        return NextResponse.json({ error: errorMessage, success: false }, { status: 500 });
    }
});

export const DELETE = withAuth(async (request: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse<ApiPostResponse>> => {
    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: "ID is required", success: false }, { status: 400 });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid ID", success: false }, { status: 400 });
        }

        await connectDB();
        const experience = await Experience.findByIdAndDelete(id);
        if (!experience) {
            return NextResponse.json({ error: "Experience not found", success: false }, { status: 404 });
        }
        return NextResponse.json({ success: true, message: 'Experience deleted successfully' }, { status: 200 });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : new Error(String("Unknown error")).message;
        return NextResponse.json({ error: errorMessage, success: false }, { status: 500 });
    }
});