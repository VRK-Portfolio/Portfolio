import { MySkillsType } from "@/@types/MySkills.types";
import { MySkillsModel } from "@/models/my-skills.model";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { GET, POST } from "../route";
import { ApiGetResponse, ApiPostResponse } from "@/@types/ApiResponse.types";
import { NextRequest } from "next/server";
import { DELETE, PUT, GET as GETById } from "../[id]/route";

vi.mock("@/libs/db", () => ({
    connectDB: vi.fn().mockResolvedValue(true)
}));
describe('My Skills API Routes', () => {

    beforeEach(async () => {
        vi.restoreAllMocks();
    });

    const mockSkills: MySkillsType[] = [
        { _id: '1', name: 'JavaScript', icon: '/images/skills/javascript.png', category: 'Language', capabilities: ['Async programming'], proficiency: 'Advanced' },
        { _id: '2', name: 'TypeScript', icon: '/images/skills/typescript.png', category: 'Language', capabilities: ['Type safety'], proficiency: 'Advanced' },
        { _id: '3', name: 'React', icon: '/images/skills/react.png', category: 'Frontend', capabilities: ['Components'], proficiency: 'Advanced' }
    ];


    test("POST should persist valid skill data and return an unconditional success response", async () => {
        const validSkill = {
            name: "React", icon: "/images/skills/react.svg", category: "Frontend",
            capabilities: ["Components"], proficiency: "Advanced",
        };
        const request = new NextRequest("http://localhost:3000/api/my-skills", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validSkill),
        });

        const response = await POST(request, { params: Promise.resolve({}) });

        expect(response.status).toBe(201);
        expect(await response.json()).toEqual({ success: true, message: "Skill created successfully" });
        expect(await MySkillsModel.findOne({ name: validSkill.name }).lean()).toMatchObject(validSkill);
    });

    test.each(["PUT", "DELETE"])("%s should normalize non-Error rejections", async (method) => {
        const id = "6ad60785c4daf1c34ef66c38";
        const request = new NextRequest(`http://localhost:3000/api/my-skills/${id}`, {
            method,
            ...(method === "PUT" ? { body: JSON.stringify({ name: "Updated" }) } : {}),
        });
        if (method === "PUT") {
            vi.spyOn(MySkillsModel, "findByIdAndUpdate").mockRejectedValueOnce("Database unavailable");
        } else {
            vi.spyOn(MySkillsModel, "findByIdAndDelete").mockRejectedValueOnce("Database unavailable");
        }

        const response = await (method === "PUT" ? PUT : DELETE)(request, { params: Promise.resolve({ id }) });

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ success: false, error: "Database unavailable" });
    });

    describe('GET /api/my-skills', () => {
        test('should fetch all skills', async () => {
            (vi.spyOn(MySkillsModel, 'find') as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSkills);
            const response = await GET();
            const data: ApiGetResponse<MySkillsType[]> = await response.json();
            expect(data.success).toBe(true);
            if (data.success) {
                expect(data.data).toHaveLength(mockSkills.length);
                expect(data.data).toEqual(mockSkills);
            }
        });

        test("should throw an error when something went wrong", async () => {
            (vi.spyOn(MySkillsModel, 'find') as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Database error"));
            const response = await GET();
            const data: ApiGetResponse<MySkillsType[]> = await response.json();
            expect(data.success).toBe(false);
            if (!data.success) {
                expect(data.error).toEqual("Database error");
            }
        });

        test("should throw an defualt error message on status 500 when not passed", async() => {
            (vi.spyOn(MySkillsModel, 'find') as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce('');
            const response = await GET();
            const data: ApiGetResponse<MySkillsType[]> = await response.json();
            expect(data.success).toBe(false);
            if (!data.success) {
                expect(data.error).toEqual('Failed to fetch skills');
            }
        })
    });

    describe('POST /api/my-skills', () => {
        test('should create a new skill', async () => {
            (vi.spyOn(MySkillsModel, 'create') as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSkills[0]);
            const request = new NextRequest('http://localhost:3000/api/my-skills', {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(mockSkills[0])
            });
            const response = await POST(request, { params: Promise.resolve({}) });
            const data: ApiPostResponse = await response.json();
            if (data.success) {
                expect(data.success).toBe(true);
                expect(data.message).toEqual('Skill created successfully');
            }
        });

        test('should throw an 422 error when parameter is invalid', async () => {
            (vi.spyOn(MySkillsModel, 'create') as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Invalid parameters"));

            const request = new NextRequest('http://localhost:3000/api/my-skills', {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                }) // Invalid body
            });
            const response = await POST(request, { params: Promise.resolve({}) });
            const data: ApiPostResponse = await response.json();
            expect(data.success).toBe(false);
            if (!data.success) {
                expect(data.error).toEqual('Parameter validation failed');
                expect(data?.errors?.length).toBeGreaterThan(0);
            }
        });

        test("should throw 500 error when something went wrong", async () => {
            (vi.spyOn(MySkillsModel.prototype, 'save') as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Something went wrong"));

            const request = new NextRequest('http://localhost:3000/api/my-skills', {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(mockSkills[0])
            });
            const response = await POST(request, { params: Promise.resolve({}) });
            const data: ApiPostResponse = await response.json();
            expect(data.success).toBe(false);
            if (!data.success) {
                expect(data.error).toEqual('Something went wrong');
            }
        });

        test("should throw a default error message on 500 status if error instance is not having any error message", async () => {
            (vi.spyOn(MySkillsModel.prototype, 'save') as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce('');

            const request = new NextRequest('http://localhost:3000/api/my-skills', {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(mockSkills[0])
            });
            const response = await POST(request, { params: Promise.resolve({}) });
            const data: ApiPostResponse = await response.json();
            expect(data.success).toBe(false);
            if (!data.success) {
                expect(data.error).toEqual('Failed to create skill');
            }
        });
    });


    describe('DELETE /api/my-skills/:id', () => {
        test('should delete a skill by id', async () => {
            (vi.spyOn(MySkillsModel, 'findByIdAndDelete') as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSkills[0]);

            const request = new NextRequest(`http://localhost:3000/api/my-skills/${mockSkills[0]._id}`, {
                method: 'DELETE'
            });
            const response = await DELETE(request, {
                params: Promise.resolve({ id: mockSkills[0]._id as string })
            });
            const data: ApiPostResponse = await response.json();
            if (data.success) {
                expect(data.success).toBe(true);
                expect(data.message).toEqual('Skill deleted successfully');
            }
        });

        test('should return 404 if skill is not found', async () => {
            (vi.spyOn(MySkillsModel, 'findByIdAndDelete') as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            const request = new NextRequest(`http://localhost:3000/api/my-skills/${mockSkills[0]._id}`, {
                method: 'DELETE'
            });
            const response = await DELETE(request, {
                params: Promise.resolve({ id: mockSkills[0]._id as string })
            });
            const data: ApiPostResponse = await response.json();
            expect(data.success).toBe(false);
            if (!data.success) {
                expect(data.error).toEqual('Skill not found');
            }
        });

        test('should return 500 if an error occurs during deletion', async () => {
            (vi.spyOn(MySkillsModel, 'findByIdAndDelete') as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error(''));

            const request = new NextRequest(`http://localhost:3000/api/my-skills/${mockSkills[0]._id}`, {
                method: 'DELETE'
            });
            const response = await DELETE(request, {
                params: Promise.resolve({ id: mockSkills[0]._id as string })
            });
            const data: ApiPostResponse = await response.json();
            expect(data.success).toBe(false);
            if (!data.success) {
                expect(data.error).toEqual('Failed to delete skill');
            }
        });
    });


    describe('Update Skill /api/my-skills/:id', () => {
        test('should update a skill by id', async () => {
            (vi.spyOn(MySkillsModel, 'findByIdAndUpdate') as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSkills[0]);
            const request = new NextRequest(`http://localhost:3000/api/my-skills/${mockSkills[0]._id}`, {
                method: 'PUT',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(mockSkills[0])
            });
            const response = await PUT(request, {
                params: Promise.resolve({ id: mockSkills[0]._id as string })
            });
            const data: ApiPostResponse = await response.json();
            if (data.success) {
                expect(data.success).toBe(true);
                expect(data.message).toEqual('Skill updated successfully');
            }
        });

        test("should return 404 if the skill to update is not found", async () => {
            (vi.spyOn(MySkillsModel, 'findByIdAndUpdate') as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            const request = new NextRequest(`http://localhost:3000/api/my-skills/${mockSkills[0]._id}`, {
                method: 'PUT',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(mockSkills[0])
            });
            const response = await PUT(request, {
                params: Promise.resolve({ id: mockSkills[0]._id as string })
            });
            const data: ApiPostResponse = await response.json();
            expect(data.success).toBe(false);
            if (!data.success) {
                expect(data.error).toEqual('Skill not found');
            }
        });

        test("should return 500 error message when something went wrong", async() => {
            (vi.spyOn(MySkillsModel, 'findByIdAndUpdate') as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Something went wrong'));
            const request = new NextRequest(`http://localhost:3000/api/my-skills/${mockSkills[0]._id}`, {
                method: 'PUT',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(mockSkills[0])
            });
            const response = await PUT(request, {
                params: Promise.resolve({ id: mockSkills[0]._id as string })
            });
            const data: ApiPostResponse = await response.json();
            expect(data.success).toBe(false);
            if (!data.success) {
                expect(data.error.length).greaterThan(0);
                expect(data.error).toEqual('Something went wrong');
            }
        });

        test("should return 500 error with a default error message ", async () => {
            (vi.spyOn(MySkillsModel, 'findByIdAndUpdate') as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error(''));
            const request = new NextRequest(`http://localhost:3000/api/my-skills/${mockSkills[0]._id}`, {
                method: 'PUT',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(mockSkills[0])
            });
            const response = await PUT(request, {
                params: Promise.resolve({ id: mockSkills[0]._id as string })
            });
            const data: ApiPostResponse = await response.json();
            expect(data.success).toBe(false);
            if (!data.success) {
                expect(data.error).toEqual('Failed to update skill');
            }
        });
    });


    describe('Get Skill by  /api/my-skills/:id ID', () => {
        test('should fetch a skill by id', async () => {
            (vi.spyOn(MySkillsModel, 'findById') as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSkills[0]);
            const request = new NextRequest(`http://localhost:3000/api/my-skills/${mockSkills[0]._id}`, {
                method: 'GET'
            });
            const response = await GETById(request, {
                params: Promise.resolve({ id: mockSkills[0]._id as string })
            });
            const data: ApiGetResponse<MySkillsType | null> = await response.json();
            if (data.success) {
                expect(data.success).toBe(true);
                expect(data.data).toEqual(mockSkills[0]);
            }
        });

        test('should return status as 404 when skill is not found', async () => {
            (vi.spyOn(MySkillsModel, 'findById') as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            const request = new NextRequest(`http://localhost:3000/api/my-skills/${mockSkills[0]._id}`, {
                method: 'GET'
            });
            const response = await GETById(request, {
                params: Promise.resolve({ id: mockSkills[0]._id as string })
            });
            const data: ApiGetResponse<MySkillsType | null> = await response.json();
            expect(data.success).toBe(false);
            if (!data.success) {
                expect(data.error).toEqual('Skill not found');
            }
        });

        test('should return 500 if an error occurs during fetching a skill by id', async () => {
            (vi.spyOn(MySkillsModel, 'findById') as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce('');
            const request = new NextRequest(`http://localhost:3000/api/my-skills/${mockSkills[0]._id}`, {
                method: 'GET'
            });
            const response = await GETById(request, {
                params: Promise.resolve({ id: mockSkills[0]._id as string })
            });
            const data: ApiGetResponse<MySkillsType | null> = await response.json();
            expect(data.success).toBe(false);
            if (!data.success) {
                expect(data.error).toEqual('Failed to fetch skills');
            }
        });

        test('should return 500 if an error occurs during fetching a skill by id with a default message', async () => { 
            (vi.spyOn(MySkillsModel, 'findById') as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Something went wrong'));
            const request = new NextRequest(`http://localhost:3000/api/my-skills/${mockSkills[0]._id}`, {
                method: 'GET'
            });
            const response = await GETById(request, {
                params: Promise.resolve({ id: mockSkills[0]._id as string })
            });
            const data: ApiGetResponse<MySkillsType | null> = await response.json();
            expect(data.success).toBe(false);
            if (!data.success) {
                expect(data.error).toEqual('Something went wrong');
            }
        });
    });
});