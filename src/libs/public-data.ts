import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
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
import { PUBLIC_DATA_TAGS } from "./public-cache";

export const getPublicProfileRecord = cache(unstable_cache(async () => {
    await connectDB();
    return BasicInfoModel.findOne().lean().exec();
}, ["public-profile"], { revalidate: 60, tags: [PUBLIC_DATA_TAGS.profile] }));

export const getPublicProfile = cache(async () => {
    const record = await getPublicProfileRecord();
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

const readPublishedBlogs = unstable_cache(async () => {
    await connectDB();
    const records = await BlogModel.find({ status: "published" }).sort({ createdAt: -1 })
        .populate<PopulatedSkills>({ path: "skills", select: "name" }).lean().exec();
    return records.map(parseBlog);
}, ["public-published-blogs"], { revalidate: 60, tags: [PUBLIC_DATA_TAGS.blogs] });

export const getPublishedBlogs = cache(async () => {
    return BlogListingSchema.array().parse(await readPublishedBlogs());
});

const readPublishedBlog = unstable_cache(async (slug: string) => {
    await connectDB();
    const record = await BlogModel.findOne({ slug, status: "published" })
        .populate<PopulatedSkills>({ path: "skills", select: "name" }).lean().exec();
    return record ? parseBlog(record) : null;
}, ["public-published-blog"], { revalidate: 60, tags: [PUBLIC_DATA_TAGS.blogs] });

export const getPublishedBlog = cache(async (slug: string) => {
    const record = await readPublishedBlog(slug);
    return record ? BlogListingSchema.parse(record) : null;
});

const readHomepageRecords = unstable_cache(async () => {
    await connectDB();
    const [skills, experiences, certifications] = await Promise.all([
        MySkillsModel.find().lean().exec(),
        Experience.find().lean().exec(),
        CertificationModel.find().lean().exec(),
    ]);
    return { skills, experiences, certifications };
}, ["public-homepage-sections"], {
    revalidate: 60,
    tags: [PUBLIC_DATA_TAGS.skills, PUBLIC_DATA_TAGS.experience, PUBLIC_DATA_TAGS.certifications],
});

export async function getHomepageData() {
    const [{ skills, experiences, certifications }, blogs] = await Promise.all([
        readHomepageRecords(), getPublishedBlogs(),
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
