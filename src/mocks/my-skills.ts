import { ApiGetResponse } from "@/@types/ApiResponse.types";
import { MySkillsType } from "@/@types/MySkills.types";
import { http, HttpResponse } from "msw";

export const mockMySkills = [
    {
        name: "HTML",
        icon: "/images/skills/html.png"
    },
    {
        name: "CSS",
        icon: "/images/skills/css-3.png"
    },
    {
        name: "JavaScript",
        icon: "/images/skills/javascript.png"
    },
    {
        name: "React",
        icon: "/images/skills/react.svg"
    },
    {
        name: "TypeScript",
        icon: "/images/skills/typescript.png"
    },
    {
        name: "Node.js",
        icon: "/images/skills/nodejs.png"
    },
    {
        name: "Next.js",
        icon: "/images/skills/nextjs.svg"
    },{
        name: "Tailwind CSS",
        icon: "/images/skills/tailwind.svg"
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