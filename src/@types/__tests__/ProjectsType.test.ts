import { describe, expect, test } from "vitest";
import { ProjectSchema, ProjectType } from "../Projects.types";
import z from "zod";

describe("ProjectsType", () => {
    const validProject = (): ProjectType[] => [{
        id: 1,
        title: "Project 1",
        technologies: ["React", "TypeScript"],
        description: "This is a sample project",
        image_url: "https://example.com/image.png"
    }];

    test("valid project should have correct structure", () => {
        const projectList = validProject();
        const projectListSchema = z.array(ProjectSchema);
        const response = projectListSchema.parse(projectList);
        expect(response).toEqual(projectList);
    });

    test("invalid project should throw an error", () => {
        const invalidProject = [{
            id: "not-a-number",
            title: "Project 1",
            technologies: ["React", "TypeScript"],
            description: "This is a sample project",
            image_url: "https://example.com/image.png"
        }];
        const projectListSchema = z.array(ProjectSchema);
        expect(() => projectListSchema.parse(invalidProject)).toThrow();
    });

    test("empty project list should be valid", () => {
        const emptyProjectList: ProjectType[] = [];
        const projectListSchema = z.array(ProjectSchema);
        const response = projectListSchema.parse(emptyProjectList);
        expect(response).toEqual(emptyProjectList);
    });

    test("project list with missing fields should throw an error", () => {
        const incompleteProject = [{
            id: 1,
            title: "Project 1",
            technologies: ["React", "TypeScript"]
        }];
        const projectListSchema = z.array(ProjectSchema);
        expect(() => projectListSchema.parse(incompleteProject)).toThrow();
    });
});