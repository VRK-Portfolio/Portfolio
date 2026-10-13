import { ApiGetResponse, ApiPostResponse } from "@/@types/ApiResponse.types";
import { MySkillsType } from "@/@types/MySkills.types";
import { withAuth } from "@/libs/auth-wrapper";
import { connectDB } from "@/libs/db";
import { MySkillsModel } from "@/models/my-skills.model";
import { NextResponse } from "next/server";

interface RouteContext {
    params: Promise<{
        id: string;
    }>;
}
export const GET = async (request: Request, context: RouteContext): Promise<NextResponse<ApiGetResponse<MySkillsType | null>>> => {
    try {
        const { id } = await context.params;
        await connectDB();

        const skills = await MySkillsModel.findById<MySkillsType>(id);
        if(!skills) {
            return NextResponse.json({
                success: false,
                error: 'Skill not found'
            }, { status: 404 });
        }
        return NextResponse.json({
            data: skills,
            success: true,
            message: 'Skills fetched successfully'
        }, { status: 200 });
    } catch (error: Error | unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        return NextResponse.json({
            success: false,
            error: err.message || 'Failed to fetch skills'
        }, { status: 500 });
    }
}

export const PUT = withAuth(async (request: Request, context: RouteContext): Promise<NextResponse<ApiPostResponse>> => {
    try {
        const { id } = await context.params;
        await connectDB();

        const body = await request.json();
        const updatedSkill = await MySkillsModel.findByIdAndUpdate<MySkillsType>(id, body, { new: true });
        if(!updatedSkill) {
            return NextResponse.json({
                success: false,
                error: 'Skill not found'
            }, { status: 404 });
        }
        return NextResponse.json({
            success: true,
            message: 'Skill updated successfully'
        }, { status: 200 });
    } catch (error: Error | unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        return NextResponse.json({
            success: false,
            error: err.message || 'Failed to update skill'
        }, { status: 500 });
    }
});


export const DELETE = withAuth(async (request: Request, context: RouteContext): Promise<NextResponse<ApiPostResponse>> => {
    try {
        const { id } = await context.params;
        await connectDB();

        const deletedSkill = await MySkillsModel.findByIdAndDelete<MySkillsType>(id);
        if(!deletedSkill) {
            return NextResponse.json({
                success: false,
                error: 'Skill not found'
            }, { status: 404 });
        }
        return NextResponse.json({
            success: true,
            message: 'Skill deleted successfully'
        }, { status: 200 });
    } catch (error: Error | unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        return NextResponse.json({
            success: false,
            error: err.message || 'Failed to delete skill'
        }, { status: 500 });
    }
});
