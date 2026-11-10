import { connectDB } from "@/libs/db";
import { MySkillsModel } from "@/models/my-skills.model";
import { seedDocuments } from "./seed-documents";

export async function seedSkills() {
    await connectDB();
    const skills = await MySkillsModel.find().lean().exec();
    return seedDocuments("skills", skills.map(skill => ({
        id: String(skill._id),
        context: `Skill: ${skill.name}`,
        text: [
            `Core capabilities:\n${skill.capabilities.map(value => `- ${value}`).join("\n")}`,
            `Category: ${skill.category}`,
            `Proficiency: ${skill.proficiency}`,
        ].join("\n"),
        skill: { name: skill.name, capabilities: skill.capabilities },
    })));
}