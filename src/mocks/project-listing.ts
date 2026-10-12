
import { http, HttpResponse } from "msw";
import { ApiGetResponse } from "@/@types/ApiResponse.types";
import { ProjectType } from "@/@types/Projects.types";

export const mockProjectListingData: ProjectType[] = [
  {
    id: 1,
    title: "Project 1",
    description: "Description for project 1",
    image_url: "https://example.com/project-1.jpg",
    technologies: ["HTML", "CSS"],
  },
  {
    id: 2,
    title: "Project 2",
    description: "Description for project 2",
    image_url: "https://example.com/project-2.jpg",
    technologies: ["React", "TypeScript"],
  },
    {
    id: 3,
    title: "Project 3",
    description: "Description for project 3",
    image_url: "https://example.com/project-3.jpg",
    technologies: ["HTML", "CSS"],
  },
  {
    id: 4,
    title: "Project 4",
    description: "Description for project 4",
    image_url: "https://example.com/project-4.jpg",
    technologies: ["React", "TypeScript"],
  }
  
];

export const handlers = [
  http.get<never, never, ApiGetResponse<typeof mockProjectListingData>>(
    "*/api/projects",
    () => {
      return HttpResponse.json({
        data: mockProjectListingData,
        success: true,
        message: "Fetched project listing successfully",
      });
    }
  ),
];

export const errorHandler = [
  http.get<never, never, ApiGetResponse<typeof mockProjectListingData>>(
    "*/api/projects",
    () => {
      return HttpResponse.json({
        success: false,
        error: "Failed to fetch projects",
      }, { status: 500 });
    }
  ),
];
