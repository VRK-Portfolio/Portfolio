import { ApiGetResponse } from "@/@types/ApiResponse.types";
import { BasicInfoType } from "@/@types/BasicInfo.types";
import { http, HttpResponse } from "msw";

export const basicInfoMock: BasicInfoType[] = [{
    name: "John Doe",
    about_me: "Passionate developer with experience in building web applications. I build accessible interfaces and reliable services using modern JavaScript and TypeScript. I enjoy collaborating with teams, solving complex problems, and delivering thoughtful user experiences. My work spans frontend development, backend APIs, and database design.",
    avatar_url: "/images/basic-info/photo.png",
    email: "john.doe@example.com",
    phone: "9876543210",
    address: "123 Main Street, City, Country",
    bio: "A brief biography about John Doe.",
    favicon_url: "/images/basic-info/favicon.png",
    github_url: "https://github.com/johndoe",
    linked_in_url: "https://www.linkedin.com/in/johndoe",
    website_url: "https://www.johndoe.com"
}];


const handlers = [
    http.get<never, never, ApiGetResponse<BasicInfoType[]>>("*/api/basic-info", () => {
        return HttpResponse.json({data: basicInfoMock, success: true, message: "Basic info fetched successfully"});
    })
];

export default handlers;