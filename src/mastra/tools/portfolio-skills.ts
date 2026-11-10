import { connectDB } from "@/libs/db";
import { MySkillsModel } from "@/models/my-skills.model";

export function isPortfolioSkillsListQuestion(prompt: string): boolean {
    const question = prompt.trim().replace(/\s+/g, " ").replace(/[.!?]+$/, "");
    return /^(?:(?:please|can you|could you) )?(?:(?:show|give|tell|list|enumerate|what are|which are)(?: me)? )?(?:the )?(?:(?:complete|full) )?(?:list of )?(?:all (?:of )?)?(?:(?:your|his|vijay(?: rameshkumar)?['’]s) )?(?:skills|technologies|tech stack)(?: (?:of|for) vijay(?: rameshkumar)?)?(?: please)?$/i.test(question)
        || /^(?:what|which) (?:skills|technologies) does vijay(?: rameshkumar)? (?:have|know|use)$/i.test(question);
}

export async function getPortfolioSkills(): Promise<string> {
    await connectDB();
    const records = await MySkillsModel.find().select("name").sort({ name: 1 }).lean().exec();
    const names = [...new Set(records.map(skill => skill.name.trim()).filter(Boolean))];
    return names.length
        ? names.map(name => `- ${name}`).join("\n")
        : "No skills are recorded in the portfolio.";
}
