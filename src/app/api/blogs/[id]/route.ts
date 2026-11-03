import { ApiPostResponse } from "@/@types/ApiResponse.types";
import { BlogWriteSchema } from "@/@types/Blogs.types";
import { withAuth } from "@/libs/auth-wrapper";
import { connectDB } from "@/libs/db";
import { BlogModel } from "@/models/blogs.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

type BlogContext = { params: Promise<{ id: string }> };

export const PUT = withAuth(async (request: Request, { params }: BlogContext): Promise<NextResponse<ApiPostResponse>> => {
    try {
        const { id } = await params;
        if (!mongoose.isObjectIdOrHexString(id)) {
            return NextResponse.json({ success: false, error: "Invalid blog ID" }, { status: 400 });
        }
        const parsed = BlogWriteSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json({
                success: false,
                error: "Invalid request body",
                errors: parsed.error.issues.map(issue => ({ field: issue.path.join("."), message: issue.message })),
            }, { status: 400 });
        }
        await connectDB();
        const blog = await BlogModel.findByIdAndUpdate(id, {
            ...parsed.data,
            updatedAt: new Date().toISOString(),
        }, { returnDocument: 'after', runValidators: true });
        if (!blog) {
            return NextResponse.json({ success: false, error: "Blog not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true, message: "Blog updated successfully" });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof SyntaxError ? "Invalid request body" : error instanceof Error ? error.message : "Failed to update blog",
        }, { status: error instanceof SyntaxError ? 400 : 500 });
    }
});

export const DELETE = withAuth(async (_request: Request, { params }: BlogContext): Promise<NextResponse<ApiPostResponse>> => {
    try {
        const { id } = await params;
        if (!mongoose.isObjectIdOrHexString(id)) {
            return NextResponse.json({ success: false, error: "Invalid blog ID" }, { status: 400 });
        }
        await connectDB();
        const blog = await BlogModel.findByIdAndDelete(id);
        if (!blog) {
            return NextResponse.json({ success: false, error: "Blog not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true, message: "Blog deleted successfully" });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to delete blog",
        }, { status: 500 });
    }
});

export const GET = async(_request: Request, { params }: BlogContext): Promise<NextResponse<ApiPostResponse>> => {
    try {
        const { id } = await params;

        await connectDB();
        const blog = await BlogModel.findOne({ slug: id}).populate("skills").lean();
        if (!blog) {
            return NextResponse.json({ success: false, error: "Blog not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: blog, message: "Blog fetched successfully" });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to fetch blog",
        }, { status: 500 });
    }
};