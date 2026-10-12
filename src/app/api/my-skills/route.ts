import { ApiGetResponse, ApiPostResponse } from "@/@types/ApiResponse.types";
import { MySkillsSchema, MySkillsType } from "@/@types/MySkills.types";
import { connectDB } from "@/libs/db";
import { MySkillsModel } from "@/models/my-skills.model";
import { NextResponse } from "next/server";

export const GET = async (): Promise<NextResponse<ApiGetResponse<MySkillsType[] | null>>> => {
    try {
        await connectDB();
        const skills = await MySkillsModel.find<MySkillsType>();
        return NextResponse.json({
            data: skills,
            success: true,
            message: 'Skills fetched successfully'
        }, { status: 200 });
    } catch (error: unknown | Error) {
        const err = error instanceof Error ? error : new Error(String(error));
        return NextResponse.json({
            success: false,
            error: err.message || 'Failed to fetch skills'
        }, { status: 500 });
    }
}


export const POST = async (request: Request): Promise<NextResponse<ApiPostResponse>> => {
    try {
        const body: unknown = await request.json();
        
        const validation = MySkillsSchema.safeParse(body);
        
        if (!validation.success) {
            return NextResponse.json({
                success: false,
                error: 'Parameter validation failed',
                errors: validation.error.issues.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                })),
            }, { status: 422 });
        }
        const { data: validatedData } = validation;

        await connectDB();
        const saveSkills = new MySkillsModel(validatedData);
        await saveSkills.save({
            validateBeforeSave: true
        });
        return NextResponse.json({
            success: true,
            message: 'Skill created successfully'
        }, { status: 201 });
    } catch (error: unknown | Error) {
        const err = error instanceof Error ? error : new Error(String(error));
        return NextResponse.json({
            success: false,
            errors: [],
            error: err.message || 'Failed to create skill'
        }, { status: 500 });
    }
}

