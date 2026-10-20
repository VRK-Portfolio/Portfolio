import { ApiGetResponse, ApiPostResponse } from "@/@types/ApiResponse.types";
import { CertificationSchema, CertificationType } from "@/@types/Certification.types";
import { withAuth } from "@/libs/auth-wrapper";
import { CertificationModel } from "@/models/certifications.model";
import { NextResponse } from "next/server";

const GET = async (): Promise<NextResponse<ApiGetResponse<CertificationType[]>>> => {
    try {
        const certifications = await CertificationModel.find();
        return NextResponse.json({
            data: certifications,
            success: true,
            message: "Certifications fetched successfully"
        }, { status: 200 });
    } catch (error: Error | unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        return NextResponse.json({
            error: err.message || "Failed to fetch certifications",
            success: false
        }, { status: 500 });
    }
};

const POST = withAuth(async (req: Request): Promise<NextResponse<ApiPostResponse>> => {
    try {
        
        const body: unknown = await req.json();
        const validation = CertificationSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({
                error: "Invalid request body",
                success: false,
                errors: validation.error.issues.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                })),
            }, { status: 400 });
        }
        const { data: validatedData } = validation;
        await CertificationModel.create(validatedData);
        return NextResponse.json({
            success: true,
            message: "Certification created successfully"
        }, { status: 201 });
    } catch (error: Error | unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        return NextResponse.json({
            error: err.message || "Failed to create certification",
            success: false
        }, { status: 500 });
    }
});
export { GET, POST };