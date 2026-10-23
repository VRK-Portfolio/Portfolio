import { ApiGetResponse, ApiPostResponse } from "@/@types/ApiResponse.types";
import { ExperiencePropsSchema, ExperienceType } from "@/@types/Experience.types";
import { NextResponse } from "next/server";
import { Experience } from "@/models/experience.model";
import { connectDB } from "@/libs/db";
import { withAuth } from "@/libs/auth-wrapper";

const GET = async (): Promise<NextResponse<ApiGetResponse<ExperienceType[]>>> => {
    try {
        await connectDB();
        const experiences = await Experience.find();
        return NextResponse.json({ data: experiences, success: true, message: "Experience fetched successfully" }, { status: 200 });
    } catch (error: Error | unknown) {
        const err = error instanceof Error ? error : new Error(String("Something went wrong!"));
        return NextResponse.json({ error: err.message, success: false }, { status: 500 });
    }

};

const POST = withAuth(async (req: Request): Promise<NextResponse<ApiPostResponse>> => {
    try {
        const body = await req.json();
        const validation = ExperiencePropsSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({
                error: "Invalid data", errors: validation.error.issues.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                })), success: false
            }, { status: 400 });
        }
        await connectDB();
        const newExperience = new Experience(validation.data);
        await newExperience.save();
        return NextResponse.json({ success: true, message: "Experience created successfully" }, { status: 201 });
    } catch (error: Error | unknown) {
        const err = error instanceof Error ? error : new Error(String("Something went wrong!"));
        return NextResponse.json({ error: err.message, success: false }, { status: 500 });
    }
});
export { GET, POST };