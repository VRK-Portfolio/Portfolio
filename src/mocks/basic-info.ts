import { ApiGetResponse } from "@/@types/ApiResponse.types";
import { BasicInfoType } from "@/@types/BasicInfo.types";
import { http, HttpResponse } from "msw";

export const basicInfoMock: BasicInfoType[] = [{
    name: "John Doe",
    about_me: "Passionate developer with experience in building web applications.",
    avatar_url: "/images/basic-info/photo.png",
    email: "john.doe@example.com",
    phone: "+1234567890",
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