import "server-only";
import { revalidateTag } from "next/cache";

export const PUBLIC_DATA_TAGS = {
    profile: "public-profile",
    skills: "public-skills",
    experience: "public-experience",
    certifications: "public-certifications",
    blogs: "public-blogs",
};

export function invalidatePublicData(section: keyof typeof PUBLIC_DATA_TAGS) {
    // Blocking expiry prevents a withdrawn article from being served stale.
    revalidateTag(PUBLIC_DATA_TAGS[section], { expire: 0 });
    if (section === "skills") {
        revalidateTag(PUBLIC_DATA_TAGS.blogs, { expire: 0 });
    }
}
