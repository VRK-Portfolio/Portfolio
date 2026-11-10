import { connectDB } from "@/libs/db";
import { CertificationModel } from "@/models/certifications.model";

export function isCertificationIssueDateQuestion(prompt: string): boolean {
    return /\bcert(?:ification|ificate|ficate)s?\b/i.test(prompt)
        && /\b(?:issue(?:d)? date|date of (?:issue|issuance)|when\b.*\bissued)\b/i.test(prompt)
        && !/\b(?:expir\w*|skills?|issuer|credential|summary|compare)\b/i.test(prompt);
}

function normalizeTitle(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export async function getCertificationIssueDate(prompt: string): Promise<string> {
    await connectDB();
    const records = await CertificationModel.find().select("title issueDate").lean().exec();
    const question = ` ${normalizeTitle(prompt)} `;
    const matches = records.filter(record => {
        const title = normalizeTitle(record.title);
        return title.length > 0 && question.includes(` ${title} `);
    });
    if (matches.length === 0) return "I could not find that information in the database.";
    if (matches.length > 1) return "Please specify a single certification title.";
    const record = matches[0];
    if (!record.issueDate) return "No issue date is recorded for this certification.";
    const date = new Date(record.issueDate);
    if (!Number.isFinite(date.getTime())) throw new Error("The certification has an invalid issue date.");
    return `Issue date: ${date.toISOString().slice(0, 10)}.`;
}
