import "server-only";
import { cache } from "react";
import type { Types } from "mongoose";
import { BasicInfoSchema } from "@/@types/BasicInfo.types";
import { BlogListingSchema } from "@/@types/Blogs.types";
import { CertificationSchema } from "@/@types/Certification.types";
import { ExperiencePropsSchema } from "@/@types/Experience.types";
import { MySkillsSchema } from "@/@types/MySkills.types";
import { BasicInfoModel } from "@/models/basic-info.model";
import { BlogModel } from "@/models/blogs.model";
import { CertificationModel } from "@/models/certifications.model";
import { Experience } from "@/models/experience.model";
import { MySkillsModel } from "@/models/my-skills.model";
import { connectDB } from "./db";
import { sortExperiences } from "./utils";

export const getPublicProfile = cache(async () => {
    await connectDB();
    const record = await BasicInfoModel.findOne().lean().exec();
    return record ? BasicInfoSchema.parse(record) : null;
});

type PopulatedSkills = { skills?: { _id: Types.ObjectId; name: string }[] };

function parseBlog(record: PopulatedSkills & { _id: Types.ObjectId | string }) {
    return BlogListingSchema.parse({
        ...record,
        _id: String(record._id),
        skills: record.skills?.map(skill => ({ _id: String(skill._id), name: skill.name })),
    });
}

export const getPublishedBlogs = cache(async () => {
    await connectDB();
    const records = await BlogModel.find({ status: "published" }).sort({ createdAt: -1 })
        .populate<PopulatedSkills>({ path: "skills", select: "name" }).lean().exec();
    return records.map(parseBlog);
});

export const getPublishedBlog = cache(async (slug: string) => {
    await connectDB();
    const record = await BlogModel.findOne({ slug, status: "published" })
        .populate<PopulatedSkills>({ path: "skills", select: "name" }).lean().exec();
    return record ? parseBlog(record) : null;
});

export async function getHomepageData() {
    await connectDB();
    const [skills, experiences, certifications, blogs] = await Promise.all([
        MySkillsModel.find().lean().exec(),
        Experience.find().lean().exec(),
        CertificationModel.find().lean().exec(),
        getPublishedBlogs(),
    ]);
    return {
        skills: MySkillsSchema.array().parse(skills.map(skill => ({ ...skill, _id: String(skill._id) }))),
        experiences: sortExperiences(ExperiencePropsSchema.array().parse(experiences.map(experience => ({
            ...experience, _id: String(experience._id),
            positions: experience.positions.map(position => ({ ...position, _id: position._id ? String(position._id) : undefined })),
        })))),
        certifications: CertificationSchema.array().parse(certifications.map(certification => ({
            ...certification, _id: String(certification._id),
        }))),
        blogs,
    };
}
