import { ApiGetResponse } from "@/@types/ApiResponse.types";
import { MySkillsType } from "@/@types/MySkills.types";
import { http, HttpResponse } from "msw";

export const mockMySkills: MySkillsType[] = [
    {
        name: "HTML",
        icon: "/images/skills/html.png",
        category: "Frontend",
        capabilities: ["Semantic markup", "Accessibility"],
        proficiency: "Advanced"
    },
    {
        name: "CSS",
        icon: "/images/skills/css-3.png",
        category: "Frontend",
        capabilities: ["Responsive layouts", "Animations"],
        proficiency: "Advanced"
    },
    {
        name: "JavaScript",
        icon: "/images/skills/javascript.png",
        category: "Language",
        capabilities: ["Async programming", "DOM manipulation"],
        proficiency: "Advanced"
    },
    {
        name: "React",
        icon: "/images/skills/react.svg",
        category: "Frontend",
        capabilities: ["Components", "Hooks"],
        proficiency: "Advanced"
    },
    {
        name: "TypeScript",
        icon: "/images/skills/typescript.png",
        category: "Language",
        capabilities: ["Type safety", "Generics"],
        proficiency: "Advanced"
    },
    {
        name: "Node.js",
        icon: "/images/skills/nodejs.png",
        category: "Backend",
        capabilities: ["REST APIs", "Async I/O"],
        proficiency: "Advanced"
    },
    {
        name: "Next.js",
        icon: "/images/skills/nextjs.svg",
        category: "Full-stack",
        capabilities: ["Routing", "Server rendering"],
        proficiency: "Advanced"
    },{
        name: "Tailwind CSS",
        icon: "/images/skills/tailwind.svg",
        category: "Frontend",
        capabilities: ["Utility classes", "Responsive design"],
        proficiency: "Advanced"
    }
];

export const mySkillsHandlers = [
    http.get<never, never, ApiGetResponse<MySkillsType[]>>('*/api/my-skills', () => {
        return HttpResponse.json(
            {
                data: mockMySkills,
                message: "Successfully fetched my skills",
                success: true
            },
            {
                status: 200
            }
        );
    })
];

export const mySkillsErrorHandler = [
    http.get<never, never, ApiGetResponse<MySkillsType[]>>('*/api/my-skills', () => {
        return HttpResponse.json(
            {
                error: "Failed to fetch my skills",
                success: false
            },
            {
                status: 500
            }
        );
    })
]