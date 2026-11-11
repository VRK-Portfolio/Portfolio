import { BasicInfoSchema } from "@/@types/BasicInfo.types";
import { BasicInfoModel } from "@/models/basic-info.model";
import { connectDB } from "./db";

const siteUrlSchema = BasicInfoSchema.pick({ website_url: true });

export async function getSiteOrigin(): Promise<string> {
    await connectDB();
    const record = await BasicInfoModel.findOne().select("website_url").lean().exec();
    if (!record) {
        throw new Error("Configure the Basic Info website URL before generating crawler metadata.");
    }
    const { website_url } = siteUrlSchema.parse(record);
    const url = new URL(website_url);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error("The basic info website URL must use HTTP or HTTPS.");
    }
    return url.origin;
}
