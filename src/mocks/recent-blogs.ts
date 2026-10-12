
import { http, HttpResponse } from "msw";
import { ApiGetResponse } from "@/@types/ApiResponse.types";
import { BlogType } from "@/@types/Blogs.types";

export const mockBlogListingData: BlogType[] = [
  {
    id: 1,
    title: "Blog 1",
    description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since 1966, when designers at Letraset and James Mosley, the librarian at St Bride Printing Library in London, took a 1914 Cicero translation and scrambled it to make dummy text for Letraset's Body Type sheets.",
    image_url: "https://example.com/blog-1.jpg",
    technologies: ["HTML", "CSS"],
    published_at: new Date("2024-06-01"),
  },
  {
    id: 2,
    title: "Blog 2",
    description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since 1966, when designers at Letraset and James Mosley, the librarian at St Bride Printing Library in London, took a 1914 Cicero translation and scrambled it to make dummy text for Letraset's Body Type sheets.",
    image_url: "https://example.com/blog-2.jpg",
    technologies: ["React", "TypeScript"],
    published_at: new Date("2024-06-02"),
  },
    {
    id: 3,
    title: "Blog 3",
    description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since 1966, when designers at Letraset and James Mosley, the librarian at St Bride Printing Library in London, took a 1914 Cicero translation and scrambled it to make dummy text for Letraset's Body Type sheets.",
    image_url: "https://example.com/blog-3.jpg",
    technologies: ["HTML", "CSS"],
    published_at: new Date("2024-06-03"),
  },
  {
    id: 4,
    title: "Blog 4",
    description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since 1966, when designers at Letraset and James Mosley, the librarian at St Bride Printing Library in London, took a 1914 Cicero translation and scrambled it to make dummy text for Letraset's Body Type sheets.",
    image_url: "https://example.com/blog-4.jpg",
    technologies: ["React", "TypeScript"],
    published_at: new Date("2024-06-04"),
  }
  
];

export const handlers = [
  http.get<never, never, ApiGetResponse<typeof mockBlogListingData>>(
    "*/api/blogs",
    () => {
      return HttpResponse.json({
        data: mockBlogListingData,
        success: true,
        message: "Fetched blog listing successfully",
      });
    }
  ),
];

export const errorHandler = [
  http.get<never, never, ApiGetResponse<typeof mockBlogListingData>>(
    "*/api/blogs",
    () => {
      return HttpResponse.json({
        success: false,
        error: "Failed to fetch blogs",
      }, { status: 500 });
    }
  ),
];
