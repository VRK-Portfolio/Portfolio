import { describe, expect, test } from "vitest";
import { BlogSchema, BlogType } from "../Blogs.types";
import z from "zod";

describe("Blogs Types", () => {

    const validBlogType: BlogType[] = [
        {
            id: 1,
            title: "Blog 1",
            description: "This is a blog post",
            image_url: "https://example.com/image1.jpg",
            technologies: ["Tech 1", "Tech 2"],
            published_at: new Date(),
        }
    ];
test("valid project should have correct structure", () => {
        const projectList = validBlogType;
        const blogsListSchema = z.array(BlogSchema);
        const response = blogsListSchema.parse(projectList);
        expect(response).toEqual(projectList);
    });

    test("invalid project should throw an error", () => {
        const invalidProject = [{
            id: "not-a-number",
            title: "Blog 1",
            technologies: ["Tech 1", "Tech 2"],
            description: "This is a blog post",
            image_url: "https://example.com/image1.jpg"
        }];
        const blogsListSchema = z.array(BlogSchema);
        expect(() => blogsListSchema.parse(invalidProject)).toThrow();
    });

    test("empty project list should be valid", () => {
        const emptyProjectList: BlogType[] = [];
        const blogsListSchema = z.array(BlogSchema);
        const response = blogsListSchema.parse(emptyProjectList);
        expect(response).toEqual(emptyProjectList);
    });

    test("project list with missing fields should throw an error", () => {
        const incompleteProject = [{
            id: 1,
            title: "Blog 1",
            technologies: ["Tech 1", "Tech 2"]
        }];
        const blogsListSchema = z.array(BlogSchema);
        expect(() => blogsListSchema.parse(incompleteProject)).toThrow();
    });
});