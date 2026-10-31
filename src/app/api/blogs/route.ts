import { ApiGetResponse, ApiPostResponse } from "@/@types/ApiResponse.types";
import { BlogsTypeSchema, BlogType, BlogListingType } from "@/@types/Blogs.types";
import mongoose from "mongoose";
import { withAuth } from "@/libs/auth-wrapper";
import { connectDB } from "@/libs/db";
import { BlogModel } from "@/models/blogs.model";
import { NextResponse } from "next/server";

export const POST = withAuth(async (req: Request):Promise<NextResponse<ApiPostResponse>> => {
    try {
        const body: BlogType = await req.json();

        const isValid = BlogsTypeSchema.safeParse(body);
        if (!isValid.success) {
            return NextResponse.json({ success: false, error: 'Invalid request body', errors: isValid.error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })) }, { status: 400 });
        }
        if (!body) {
            return NextResponse.json({ success: false, error: 'Request body is required' }, { status: 400 });
        }

        body.skills?.forEach(skill => {
            if (typeof skill !== 'string' || !skill || !mongoose.Types.ObjectId.isValid(skill)) {
                throw new Error('Invalid skill ID');
            }
        });
        await connectDB();
        await BlogModel.create(body);
        return NextResponse.json({ success: true, message: 'Blog created successfully' }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
    }
});


export const GET = async (): Promise<NextResponse<ApiGetResponse<BlogListingType[]>>> => {
    try {
        await connectDB();
        const blogs = await BlogModel.find().populate<{
            skills: { _id: mongoose.Types.ObjectId; name: string }[];
        }>({ path: 'skills', select: 'name' }).lean();
        const data: BlogListingType[] = blogs.map(blog => ({
            ...blog,
            _id: String(blog._id),
            skills: blog.skills?.map(skill => ({ _id: String(skill._id), name: skill.name })),
        }));
        return NextResponse.json({ success: true, data, message: 'Blogs fetched successfully' }, { status: 200 });
    } catch (error: Error | unknown) {
        const err = error instanceof Error ? error.message : new Error(String("Unknown error")).message;
        return NextResponse.json({ success: false, error: err }, { status: 500 });
    }
}