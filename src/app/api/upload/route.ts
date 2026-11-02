import { BlobError, put } from "@vercel/blob";
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
        if (error instanceof BlobError && err.includes('No blob credentials found.')) {
            return NextResponse.json({
                success: false,
                error: 'Image uploads need valid Vercel Blob credentials. Set BLOB_READ_WRITE_TOKEN on the server, or refresh Vercel OIDC credentials with BLOB_STORE_ID. Restart the development server after changing environment variables.',
            }, { status: 503 });
        }
        return NextResponse.json({ error: `File upload failed: ${err}` }, { status: 500 });
    }
}