import z from "zod";

export const imageMimeTypes = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

export const uploadImageFile = async (file: File): Promise<string> => {
    if (!imageMimeTypes.includes(file.type)) {
        throw new Error('Choose an SVG, PNG, JPG, or WebP image.');
    }
    const body = new FormData();
    body.append('file', file);
    const response = await fetch('/api/upload', { method: 'POST', body });
    const data: unknown = await response.json();
    if (!response.ok) {
        throw new Error(
            data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
                ? data.error : 'Image upload failed. Please try again.'
        );
    }
    if (!data || typeof data !== 'object' || !('fileUrl' in data) || typeof data.fileUrl !== 'string') {
        throw new Error('The upload did not return an image URL.');
    }
    const parsed = z.url({ protocol: /^https?$/ }).safeParse(data.fileUrl);
    if (!parsed.success) throw new Error('The upload did not return a valid image URL.');
    return parsed.data;
};
