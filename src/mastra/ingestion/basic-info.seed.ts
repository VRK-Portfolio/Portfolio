import { connectDB } from "@/libs/db";
import { BasicInfoModel } from "@/models/basic-info.model";
import { seedDocuments, toPlainText } from "./seed-documents";

export async function seedBasicInfo() {
    await connectDB();
    const basicInfo = await BasicInfoModel.findOne()
        .select("name email bio about_me phone address linked_in_url github_url website_url").lean().exec();
    if (!basicInfo) throw new Error("No basic info found in the database.");

    return seedDocuments("basic-info", [{
        id: String(basicInfo._id),
        context: `Portfolio owner: ${basicInfo.name}`,
        text: [
            `Name: ${basicInfo.name}`,
            `Email: ${basicInfo.email}`,
            `Bio: ${basicInfo.bio}`,
            `About: ${toPlainText(basicInfo.about_me)}`,
            `Phone: ${basicInfo.phone}`,
            `Address: ${basicInfo.address}`,
            `LinkedIn URL: ${basicInfo.linked_in_url}`,
            `GitHub URL: ${basicInfo.github_url}`,
            `Website URL: ${basicInfo.website_url}`,
        ].join("\n"),
    }]);
}
