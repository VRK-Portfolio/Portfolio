import { mkdir, writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

const ALLOWED_MIME_TYPES = [
    'image/svg+xml',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp'
];

const ALLOWED_EXTENSIONS = ['.svg', '.png', '.jpg', '.jpeg', '.webp'];

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file || typeof file === 'string') {
            return NextResponse.json({ success: false, error: 'No valid file uploaded' }, { status: 400 });
        }

        // Validate MIME type
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid file format. Only SVG, PNG, JPG, and WebP are allowed.'
            }, { status: 400 });
        }

        // Validate file extension
        const ext = path.extname(file.name).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            return NextResponse.json({ 
                success: false, 
                error: 'Invalid file extension. Only .svg, .png, .jpg, .jpeg, and .webp are allowed.' 
            }, { status: 400 });
        }
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadDir = path.join(process.cwd(), 'public/uploads');
        await mkdir(uploadDir, { recursive: true });

        const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
        const filePath = path.join(uploadDir, fileName);

        await writeFile(filePath, buffer);

        const fileUrl = `/uploads/${fileName}`;

        return new Response(JSON.stringify({ message: 'File uploaded successfully', fileUrl }), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'File upload failed' }), { status: 500 });
    }
}