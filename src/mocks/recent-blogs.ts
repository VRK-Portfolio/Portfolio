import { http, HttpResponse } from "msw";
import { ApiGetResponse } from "@/@types/ApiResponse.types";
import { BlogListingType } from "@/@types/Blogs.types";

export const mockBlogListingData: BlogListingType[] = [
  {
    _id: "507f1f77bcf86cd799439011",
    title: "Blog 1",
    slug: "blog-1",
    category: "Frontend",
    content: "Practical approaches to building accessible web interfaces with semantic HTML and modern CSS.",
    coverImage: "https://vijayrameshkumar.com/images/blog-1.jpg",
    skills: [
      { _id: "507f1f77bcf86cd799439021", name: "HTML" },
      { _id: "507f1f77bcf86cd799439022", name: "CSS" },
    ],
    status: "published",
    author: "Vijay Rameshkumar",
    createdAt: "2024-06-01T00:00:00.000Z",
  },
  {
    _id: "507f1f77bcf86cd799439012",
    title: "Blog 2",
    slug: "blog-2",
    category: "Frontend",
    content: "Building reliable React components with TypeScript and focused tests.",
    coverImage: "https://vijayrameshkumar.com/images/blog-2.jpg",
    skills: [
      { _id: "507f1f77bcf86cd799439023", name: "React" },
      { _id: "507f1f77bcf86cd799439024", name: "TypeScript" },
    ],
    status: "published",
    author: "Vijay Rameshkumar",
    createdAt: "2024-06-02T00:00:00.000Z",
  },
  {
    _id: "507f1f77bcf86cd799439013",
    title: "Blog 3",
    slug: "blog-3",
    category: "Frontend",
    content: "Improving layout responsiveness with semantic markup and CSS grid.",
    coverImage: "https://vijayrameshkumar.com/images/blog-3.jpg",
    skills: [
      { _id: "507f1f77bcf86cd799439021", name: "HTML" },
      { _id: "507f1f77bcf86cd799439022", name: "CSS" },
    ],
    status: "published",
    author: "Vijay Rameshkumar",
    createdAt: "2024-06-03T00:00:00.000Z",
  },
  {
    _id: "507f1f77bcf86cd799439014",
    title: "Blog 4",
    slug: "blog-4",
    category: "Frontend",
    content: "Patterns for maintainable React applications and type-safe state management.",
    coverImage: "https://vijayrameshkumar.com/images/blog-4.jpg",
    skills: [
      { _id: "507f1f77bcf86cd799439023", name: "React" },
      { _id: "507f1f77bcf86cd799439024", name: "TypeScript" },
    ],
    status: "published",
    author: "Vijay Rameshkumar",
    createdAt: "2024-06-04T00:00:00.000Z",
  },
];

export const handlers = [
  http.get<never, never, ApiGetResponse<BlogListingType[]>>("*/api/blogs", () => {
    return HttpResponse.json({
      data: mockBlogListingData,
      success: true,
      message: "Fetched blog listing successfully",
    });
  }),
];

export const errorHandler = [
  http.get<never, never, ApiGetResponse<BlogListingType[]>>("*/api/blogs", () => {
    return HttpResponse.json({
      success: false,
      error: "Failed to fetch blogs",
    }, { status: 500 });
  }),
];
