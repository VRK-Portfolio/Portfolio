import { connectDB } from "@/libs/db";
import { Experience } from "@/models/experience.model";
import { seedDocuments, toPlainText } from "./seed-documents";

export async function seedExperience() {
    await connectDB();
    const experiences = await Experience.find().lean().exec();

    return seedDocuments("experience", experiences.flatMap(experience =>
        experience.positions.map((position, index) => ({
            id: `${experience._id}:${position._id ?? index}`,
            context: `Experience: ${experience.company}\nRole: ${position.role}`,
            text: [
                `Company: ${experience.company}`,
                `Location: ${experience.location}`,
                `Responsibilities: ${experience.responsibilites.join(", ")}`,
                `Role: ${position.role}`,
                `Start date: ${new Date(position.startDate).toISOString().slice(0, 10)}`,
                `End date: ${position.isCurrentPosition ? "Present" :
                    position.endDate ? new Date(position.endDate).toISOString().slice(0, 10) : "Not specified"}`,
                `Current position: ${position.isCurrentPosition ? "Yes" : "No"}`,
                `Description: ${toPlainText(position.description)}`,
            ].join("\n"),
        })),
    ));
}
