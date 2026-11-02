import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { BlogListingType, BlogWriteSchema } from "@/@types/Blogs.types";
import { mockDialogMethods } from "@/tests/dialog";
import { renderWithQueryClient } from "@/tests/tan-query";
import BlogListingScreen from "../BlogListingScreen";

vi.mock("@/hooks/useSkills", () => ({
    useSkills: () => ({ skills: [], isSkillsLoading: false, isSkillsError: false }),
}));
vi.mock("@/block/ui/rich-text-editor/RichTextEditor", () => ({
    default: ({ label, initialContent, onChange, disabled }: {
        label: string; initialContent: string; onChange: (html: string) => void; disabled: boolean;
    }) => <textarea aria-label={label} defaultValue={initialContent} disabled={disabled} onChange={event => onChange(event.target.value)} />,
}));

describe("Admin blog CRUD workflows", () => {
    let remote: BlogListingType[];
    let failDelete: number | undefined;
    let failCreate: boolean;
    let dialog: ReturnType<typeof mockDialogMethods>;
    const fetchMock = vi.fn<typeof fetch>();
    const id = "507f1f77bcf86cd799439011";

    beforeEach(() => {
        remote = [];
        failDelete = undefined;
        failCreate = false;
        dialog = mockDialogMethods();
        fetchMock.mockReset();
        fetchMock.mockImplementation(async (input, init) => {
            const url = String(input);
            if (url === "/api/upload") {
                return Response.json({ fileUrl: "https://portfolio.public.blob.vercel-storage.com/uploads/cover.png" });
            }
            if (url === "/api/blogs" && !init?.method) {
                return Response.json({ success: true, data: remote });
            }
            if (init?.method === "DELETE") {
                if (failDelete) return Response.json({ success: false, error: "Delete unavailable" }, { status: failDelete });
                remote = remote.filter(blog => `/api/blogs/${blog._id}` !== url);
                return Response.json({ success: true, message: "Deleted" });
            }
            if (init?.method === "POST" || init?.method === "PUT") {
                if (failCreate) return Response.json({ success: false, error: "Save unavailable" }, { status: 503 });
                const values = BlogWriteSchema.parse(JSON.parse(String(init.body)));
                const saved = { ...values, _id: id, skills: values.skills.map(_id => ({ _id, name: "React" })) };
                remote = init.method === "POST" ? [...remote, saved] : remote.map(blog => `/api/blogs/${blog._id}` === url ? saved : blog);
                return Response.json({ success: true, message: "Saved" });
            }
            throw new Error(`Unexpected request: ${url}`);
        });
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        dialog.restore();
        vi.unstubAllGlobals();
    });

    const fillNewBlog = async () => {
        const user = userEvent.setup();
        await user.click(await screen.findByRole("button", { name: "New Blog" }));
        await user.type(screen.getByRole("textbox", { name: "Title" }), "First blog");
        await user.type(screen.getByRole("textbox", { name: "Category" }), "Frontend");
        await user.type(screen.getByRole("textbox", { name: "Blog content" }), "<p>Original rich content</p>");
        return user;
    };

    test("creates, preloads, updates and deletes a blog with automatic listing refreshes", async () => {
        renderWithQueryClient(<BlogListingScreen />);
        const user = await fillNewBlog();
        await user.upload(screen.getByLabelText("Cover image"), new File(["cover data"], "cover.png", { type: "image/png" }));
        await screen.findByRole("img", { name: "Blog cover preview" });
        await user.click(screen.getByRole("button", { name: "Add Blog" }));
        await screen.findByRole("heading", { name: "First blog", level: 3 });
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        expect(screen.getByText("Original rich content")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Edit Blog" }));
        expect(screen.getByRole("heading", { name: "Edit Blog" })).toBeInTheDocument();
        expect(screen.getByRole("textbox", { name: "Blog content" })).toHaveValue("<p>Original rich content</p>");
        await user.clear(screen.getByRole("textbox", { name: "Title" }));
        await user.type(screen.getByRole("textbox", { name: "Title" }), "Updated blog");
        fireEvent.change(screen.getByRole("textbox", { name: "Blog content" }), { target: { value: "<p>Changed <strong>content</strong></p>" } });
        await user.selectOptions(screen.getByRole("combobox", { name: "Status" }), "published");
        await user.click(screen.getByRole("button", { name: "Update Blog" }));
        await screen.findByRole("heading", { name: "Updated blog", level: 3 });
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        expect(remote[0]).toMatchObject({
            _id: id, slug: "first-blog", status: "published", content: "<p>Changed <strong>content</strong></p>",
            coverImage: "https://portfolio.public.blob.vercel-storage.com/uploads/cover.png",
        });

        await user.click(screen.getByRole("button", { name: "Delete Blog" }));
        await waitFor(() => expect(screen.queryByRole("article")).not.toBeInTheDocument());
        expect(remote).toEqual([]);
        const writes = fetchMock.mock.calls.filter(([url, init]) => init?.method && url !== "/api/upload");
        expect(writes.map(([url, init]) => [url, init?.method])).toEqual([
            ["/api/blogs", "POST"], [`/api/blogs/${id}`, "PUT"], [`/api/blogs/${id}`, "DELETE"],
        ]);
    });

    test.each([200, 503])("keeps the card and exposes unsuccessful deletion with status %i", async status => {
        remote = [{ _id: id, title: "Keep me", slug: "keep-me", category: "Frontend", content: "<p>Content</p>" }];
        failDelete = status;
        renderWithQueryClient(<BlogListingScreen />);
        fireEvent.click(await screen.findByRole("button", { name: "Delete Blog" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("Delete unavailable");
        expect(screen.getByRole("heading", { name: "Keep me" })).toBeInTheDocument();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Delete Blog" })).toBeEnabled();
    });

    test("preserves the form and content when saving fails", async () => {
        failCreate = true;
        renderWithQueryClient(<BlogListingScreen />);
        const user = await fillNewBlog();
        await user.click(screen.getByRole("button", { name: "Add Blog" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("Save unavailable");
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByRole("textbox", { name: "Blog content" })).toHaveValue("<p>Original rich content</p>");
        expect(remote).toEqual([]);
    });
});
