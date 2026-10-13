import z from "zod";

export const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export const truncateText = (text:string, maxLength: number = 300): string => {
  if (!text.trim() || text.trim().length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`
}

export const formatDate = (date: Date = new Date()): string => {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  });
}


export const urlOrRelativePath = z.string().refine(
    (val: string) => {
        // Allow root-relative paths like "/images/..." or standard HTTP/HTTPS URLs
        return val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://');
    },
    { message: "Must be a valid URL or a root-relative path starting with '/'" }
);
