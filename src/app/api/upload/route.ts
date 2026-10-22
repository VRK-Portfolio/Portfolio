import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

const ALLOWED_MIME_TYPES = [
    'image/svg+xml',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp'
];

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file || typeof file === 'string') {
            return NextResponse.json({ success: false, error: 'No valid file uploaded' }, { status: 400 });
        }

        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid file format. Only SVG, PNG, JPG, and WebP are allowed.'
            }, { status: 400 });
        }

        // Upload directly to Vercel Blob storage (persistent & cloud-hosted)
        const blob = await put(`uploads/${Date.now()}-${file.name.replace(/\s+/g, '_')}`, file, {
            access: 'public',
        });

        console.log(blob.url, blob);
        return NextResponse.json({ 
            message: 'File uploaded successfully', 
            fileUrl: blob.url 
        }, { status: 200 });
        
    } catch (error: unknown) {
        const err = error instanceof Error ? error.message : String(error);
        console.error(err);
        return NextResponse.json({ error: `File upload failed: ${err}` }, { status: 500 });
    }
}