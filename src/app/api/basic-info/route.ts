import { BasicInfoModel } from '@/models/basic-info.model'
import { NextResponse } from 'next/server'
import { BasicInfoSchema, BasicInfoType } from '@/@types/BasicInfo.types'
import { ApiGetResponse, ApiPostResponse } from '@/@types/ApiResponse.types'
import { connectDB } from '@/libs/db'
import { withAuth } from '@/libs/auth-wrapper'

/**
 * GET /api/basic-info
 * Fetches all basic info entries from the database.
 * @returns {Promise<NextResponse<ApiGetResponse<BasicInfoType[] | null>>>} The response containing the basic info data or an error message.
 */

export const GET = async (): Promise<NextResponse<ApiGetResponse<BasicInfoType[] | null>>> => {
  try {
    await connectDB();
    const basicInfo = await BasicInfoModel.find();
    return NextResponse.json({
      data: basicInfo,
      success: true,
      message: 'Basic info fetched successfully'
    }, { status: 200 })
  } catch (error: Error | unknown) {
     const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to fetch basic info'
    }, { status: 500 })
  }
}


export const POST = withAuth(async (request: Request): Promise<NextResponse<ApiPostResponse>> => {
  try {
    const body: unknown = await request.json();

    const validation = BasicInfoSchema.safeParse(body);
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
    const now = new Date();
    await BasicInfoModel.findOneAndUpdate(
      {},
      {
        $set: {
          ...validatedData,
          updated_at: now,
        },
        $setOnInsert: {
          created_at: now,
        }
      },
      {
        returnDocument: 'after', // Return the updated document
        upsert: true, // Create if document doesn't exist yet
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );
    return NextResponse.json({
      message: 'Basic info created successfully',
      success: true,
    }, { status: 201 });

  } catch (error: Error | unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to process request'
    }, { status: 500 });
  }
});
