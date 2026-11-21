import z from "zod";
import type { ExperienceType } from "@/@types/Experience.types";

export const htmlToPlainText = (html: string): string => {
  const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&([a-z]+|#\d+|#x[a-f\d]+);/gi, (match, entity: string) => {
      if (!entity.startsWith("#")) return entities[entity.toLowerCase()] ?? match;
      const code = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
        ? String.fromCodePoint(code) : match;
    })
    .replace(/\s+/g, " ").trim();
};

export const sortExperiences = (experiences: ExperienceType[]): ExperienceType[] =>
  experiences.map(experience => ({
    ...experience,
    positions: [...experience.positions].sort((a, b) => b.startDate.getTime() - a.startDate.getTime()),
  })).sort((a, b) => (b.positions[0]?.startDate.getTime() ?? 0) - (a.positions[0]?.startDate.getTime() ?? 0));

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
