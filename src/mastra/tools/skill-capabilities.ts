import { connectDB } from "@/libs/db";
import { VectorStoreModel } from "@/models/vector-store.model";

export function getCapabilitySkillName(prompt: string): string | undefined {
    const question = prompt.trim().replace(/\s+/g, " ");
    const match = /^(?:(?:what|which) (?:is|are) (?:the )?|(?:please )?(?:show|list|give)(?: me)? (?:the )?)?(?:core )?capabilities (?:of|for) (.+?)[?!.]*$/i.exec(question);
    const name = match?.[1].trim();
    return name && !/\b(?:and|compare)\b/i.test(name) ? name : undefined;
}

export async function getSkillCapabilities(name: string): Promise<string> {
    await connectDB();
    const records = await VectorStoreModel.find({ source: "skills" }).select("text skill").lean().exec();
    const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
    const capabilities = records.flatMap(record => {
        if (record.skill) {
            return normalize(record.skill.name) === normalize(name) ? record.skill.capabilities : [];
        }
        // Existing skill records predate structured metadata; preserve their saved text verbatim.
        const legacy = /^Skill Name is (.*?), Core Capabilities are ([\s\S]*), Category is [\s\S]*?, Proficiency is /i.exec(record.text);
        return legacy && normalize(legacy[1]) === normalize(name) ? [legacy[2]] : [];
    });
    const saved = [...new Set(capabilities.map(value => value.trim()).filter(Boolean))];
    return saved.length
        ? saved.map(value => `- ${value}`).join("\n")
        : "I could not find that information in the database.";
}
