import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { BlogListingType, BlogWriteType } from "@/@types/Blogs.types";
import AddEditBlogs, { BlogModalState } from "../AddEditBlogs";

type Callbacks = { onSuccess: () => void; onError: (error: Error) => void };
const hooks = vi.hoisted(() => ({
    blogs: [] as BlogListingType[],
    isLoading: false, isError: false, error: null as Error | null, isCreating: false, isUpdating: false,
    createBlog: vi.fn<(blog: BlogWriteType, callbacks: Callbacks) => void>(),
    updateBlog: vi.fn<(blog: BlogWriteType & { _id: string }, callbacks: Callbacks) => void>(),
}));
vi.mock("@/hooks/useBlogListing", () => ({
    useBlogListing: () => hooks,
    useCreateBlog: () => ({ createBlog: hooks.createBlog, isCreating: hooks.isCreating }),
    useUpdateBlog: () => ({ updateBlog: hooks.updateBlog, isUpdating: hooks.isUpdating }),
}));
vi.mock("@/hooks/useSkills", () => ({
    useSkills: () => ({
        skills: [{ _id: "507f1f77bcf86cd799439021", name: "React" }],
        isSkillsLoading: false, isSkillsError: false,
    }),
}));
vi.mock("@/block/ui/rich-text-editor/RichTextEditor", () => ({
    default: ({ label, initialContent, onChange, disabled, onUploadingChange }: {
        label: string; initialContent: string; onChange: (html: string) => void; disabled: boolean; onUploadingChange: (busy: boolean) => void;
    }) => <>
        <textarea aria-label={label} defaultValue={initialContent} disabled={disabled} onChange={event => onChange(event.target.value)} />
        <button type="button" onClick={() => onUploadingChange(true)}>Start image upload</button>
        <button type="button" onClick={() => onUploadingChange(false)}>Finish image upload</button>
    </>,
}));

const blog: BlogListingType = {
    _id: "507f1f77bcf86cd799439011", title: "Existing blog", slug: "existing-blog",
    category: "Frontend", content: "<p>Existing content</p>", status: "published",
    author: "Existing author", coverImage: "/images/existing.png",
    skills: [{ _id: "507f1f77bcf86cd799439021", name: "React" }],
};
const addState: BlogModalState = { isOpen: true, mode: "add", blogId: null };
const editState: BlogModalState = { isOpen: true, mode: "edit", blogId: blog._id };
const renderForm = (modalState = addState) => {
    const setModalState = vi.fn();
    return { ...render(<AddEditBlogs modalState={modalState} setModalState={setModalState} />), setModalState };
};
const fillForm = async () => {
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox", { name: "Title" }), "New Blog");
    await user.type(screen.getByRole("textbox", { name: "Category" }), "Frontend");
    await user.type(screen.getByRole("textbox", { name: "Blog content" }), "<p>New rich text</p>");
    return user;
};

describe("Blog add/edit form", () => {
    beforeEach(() => {
        hooks.blogs = [blog];
        hooks.isLoading = hooks.isError = hooks.isCreating = hooks.isUpdating = false;
        hooks.error = null;
        hooks.createBlog.mockReset();
        hooks.updateBlog.mockReset();
    });
    afterEach(() => vi.unstubAllGlobals());

    test("creates a schema-shaped blog and closes only after a successful save", async () => {
        const { setModalState } = renderForm();
        const user = await fillForm();
        expect(screen.getByRole("textbox", { name: "Slug" })).toHaveValue("new-blog");
        await user.click(screen.getByRole("checkbox", { name: "React" }));
        await user.selectOptions(screen.getByRole("combobox", { name: "Status" }), "published");
        await user.click(screen.getByRole("button", { name: "Add Blog" }));
        await waitFor(() => expect(hooks.createBlog).toHaveBeenCalledOnce());
        expect(hooks.createBlog.mock.calls[0][0]).toEqual({
            title: "New Blog", slug: "new-blog", category: "Frontend", content: "<p>New rich text</p>",
            skills: [blog.skills?.[0]._id], status: "published", author: "Vijay Rameshkumar", coverImage: "",
        });
        expect(setModalState).not.toHaveBeenCalled();
        act(() => hooks.createBlog.mock.calls[0][1].onSuccess());
        expect(setModalState).toHaveBeenCalledWith({ isOpen: false, mode: "add", blogId: null });
    });

    test("loads every editable field and updates the selected ID with rich text and skill IDs", async () => {
        renderForm(editState);
        expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue(blog.title);
        expect(screen.getByRole("textbox", { name: "Blog content" })).toHaveValue(blog.content);
        expect(screen.getByRole("textbox", { name: "Author" })).toHaveValue(blog.author);
        expect(screen.queryByRole("textbox", { name: "Cover image URL" })).not.toBeInTheDocument();
        expect(screen.getByRole("img", { name: "Blog cover preview" })).toHaveAttribute("src", blog.coverImage);
        expect(screen.getByRole("combobox", { name: "Status" })).toHaveValue("published");
        expect(screen.getByRole("checkbox", { name: "React" })).toBeChecked();
        fireEvent.change(screen.getByRole("textbox", { name: "Blog content" }), { target: { value: "<p>Updated <strong>content</strong></p>" } });
        fireEvent.click(screen.getByRole("checkbox", { name: "React" }));
        fireEvent.click(screen.getByRole("button", { name: "Update Blog" }));
        await waitFor(() => expect(hooks.updateBlog).toHaveBeenCalledOnce());
        expect(hooks.updateBlog.mock.calls[0][0]).toMatchObject({
            _id: blog._id, content: "<p>Updated <strong>content</strong></p>", skills: [], coverImage: blog.coverImage,
        });
        expect(hooks.createBlog).not.toHaveBeenCalled();
    });

    test("validates required fields and rejects an empty rich-text document", async () => {
        renderForm();
        fireEvent.click(screen.getByRole("button", { name: "Add Blog" }));
        expect(await screen.findByText("Title is required")).toBeInTheDocument();
        expect(screen.getByText("Category is required")).toBeInTheDocument();
        expect(screen.getByText("Blog content is required")).toBeInTheDocument();
        await fillForm();
        fireEvent.change(screen.getByRole("textbox", { name: "Blog content" }), { target: { value: "<p><br></p>" } });
        fireEvent.click(screen.getByRole("button", { name: "Add Blog" }));
        await waitFor(() => expect(screen.getByText("Blog content is required")).toBeInTheDocument());
        expect(hooks.createBlog).not.toHaveBeenCalled();
    });

    test("keeps edits after save failures and background listing refreshes", async () => {
        const { rerender, setModalState } = renderForm(editState);
        fireEvent.change(screen.getByRole("textbox", { name: "Title" }), { target: { value: "Unsaved title" } });
        hooks.blogs = [{ ...blog }];
        rerender(<AddEditBlogs modalState={editState} setModalState={setModalState} />);
        expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue("Unsaved title");
        fireEvent.click(screen.getByRole("button", { name: "Update Blog" }));
        await waitFor(() => expect(hooks.updateBlog).toHaveBeenCalledOnce());
        act(() => hooks.updateBlog.mock.calls[0][1].onError(new Error("Save unavailable")));
        expect(screen.getByRole("alert")).toHaveTextContent("Save unavailable");
        expect(setModalState).not.toHaveBeenCalled();
        expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue("Unsaved title");
    });

    test("blocks saving during image uploads and disables the editor during saves", () => {
        const { rerender, setModalState } = renderForm();
        fireEvent.click(screen.getByRole("button", { name: "Start image upload" }));
        expect(screen.getByRole("button", { name: "Add Blog" })).toBeDisabled();
        fireEvent.click(screen.getByRole("button", { name: "Finish image upload" }));
        expect(screen.getByRole("button", { name: "Add Blog" })).toBeEnabled();
        hooks.isCreating = true;
        rerender(<AddEditBlogs modalState={addState} setModalState={setModalState} />);
        expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
        expect(screen.getByRole("textbox", { name: "Blog content" })).toBeDisabled();
    });

    test("handles loading, failed queries, missing blogs and closed forms", () => {
        const { rerender, setModalState } = renderForm({ ...addState, isOpen: false });
        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
        hooks.isLoading = true;
        rerender(<AddEditBlogs modalState={editState} setModalState={setModalState} />);
        expect(screen.getByRole("status")).toHaveTextContent("Loading blog");
        hooks.isLoading = false; hooks.isError = true; hooks.error = new Error("Offline");
        rerender(<AddEditBlogs modalState={editState} setModalState={setModalState} />);
        expect(screen.getByRole("alert")).toHaveTextContent("Offline");
        hooks.isError = false; hooks.blogs = [];
        rerender(<AddEditBlogs modalState={editState} setModalState={setModalState} />);
        expect(screen.getByRole("alert")).toHaveTextContent("Blog not found");
    });

    test("uploads a new cover before saving its persistent URL", async () => {
        let finishUpload: ((response: Response) => void) | undefined;
        const fetchMock = vi.fn<typeof fetch>(() => new Promise(resolve => { finishUpload = resolve; }));
        vi.stubGlobal("fetch", fetchMock);
        renderForm();
        await fillForm();
        const input = screen.getByLabelText("Cover image");
        const file = new File(["cover data"], "cover.png", { type: "image/png" });
        fireEvent.change(input, { target: { files: [file] } });
        expect(screen.getByRole("status")).toHaveTextContent("Uploading cover image");
        expect(screen.getByRole("button", { name: "Add Blog" })).toBeDisabled();
        expect(input).toBeDisabled();
        expect(fetchMock).toHaveBeenCalledWith("/api/upload", { method: "POST", body: expect.any(FormData) });
        const body = fetchMock.mock.calls[0][1]?.body;
        expect(body).toBeInstanceOf(FormData);
        if (body instanceof FormData) expect(body.get("file")).toBe(file);
        const url = "https://storage.example.com/cover.png";
        finishUpload?.(Response.json({ fileUrl: url }));
        expect(await screen.findByRole("img", { name: "Blog cover preview" })).toHaveAttribute("src", url);
        expect(input).toHaveValue("");
        expect(screen.getByRole("button", { name: "Add Blog" })).toBeEnabled();
        fireEvent.click(screen.getByRole("button", { name: "Add Blog" }));
        await waitFor(() => expect(hooks.createBlog).toHaveBeenCalledOnce());
        expect(hooks.createBlog.mock.calls[0][0].coverImage).toBe(url);
    });

    test("replaces a cover and keeps its uploaded URL for save retries", async () => {
        const url = "https://storage.example.com/replacement.webp";
        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ fileUrl: url }));
        vi.stubGlobal("fetch", fetchMock);
        renderForm(editState);
        fireEvent.change(screen.getByLabelText("Cover image"), {
            target: { files: [new File(["image"], "replacement.webp", { type: "image/webp" })] },
        });
        await waitFor(() => expect(screen.getByRole("img", { name: "Blog cover preview" })).toHaveAttribute("src", url));
        fireEvent.click(screen.getByRole("button", { name: "Update Blog" }));
        await waitFor(() => expect(hooks.updateBlog).toHaveBeenCalledOnce());
        expect(hooks.updateBlog.mock.calls[0][0]).toMatchObject({ _id: blog._id, coverImage: url });
        act(() => hooks.updateBlog.mock.calls[0][1].onError(new Error("Save unavailable")));
        fireEvent.click(screen.getByRole("button", { name: "Update Blog" }));
        await waitFor(() => expect(hooks.updateBlog).toHaveBeenCalledTimes(2));
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(hooks.updateBlog.mock.calls[1][0].coverImage).toBe(url);
    });

    test("can explicitly remove an existing cover", async () => {
        renderForm(editState);
        fireEvent.click(screen.getByRole("button", { name: "Remove cover image" }));
        expect(screen.queryByRole("img", { name: "Blog cover preview" })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Update Blog" }));
        await waitFor(() => expect(hooks.updateBlog).toHaveBeenCalledOnce());
        expect(hooks.updateBlog.mock.calls[0][0].coverImage).toBe("");
    });

    test.each(["HTTP", "network", "JSON", "missing URL", "unsafe URL"])("preserves the previous cover and blocks saving after an upload %s error", async kind => {
        const fetchMock = vi.fn<typeof fetch>();
        if (kind === "network") fetchMock.mockRejectedValue(new Error("Offline"));
        else if (kind === "HTTP") fetchMock.mockResolvedValue(Response.json({ error: "Upload unavailable" }, { status: 503 }));
        else if (kind === "JSON") fetchMock.mockResolvedValue(new Response("{"));
        else fetchMock.mockResolvedValue(Response.json(kind === "missing URL" ? {} : { fileUrl: "javascript:alert(1)" }));
        vi.stubGlobal("fetch", fetchMock);
        renderForm(editState);
        fireEvent.change(screen.getByLabelText("Cover image"), {
            target: { files: [new File(["image"], "cover.png", { type: "image/png" })] },
        });
        expect(await screen.findByRole("alert")).not.toBeEmptyDOMElement();
        expect(screen.getByRole("button", { name: "Update Blog" })).toBeDisabled();
        expect(screen.getByRole("img", { name: "Blog cover preview" })).toHaveAttribute("src", blog.coverImage);
        expect(hooks.updateBlog).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole("button", { name: "Discard failed upload" }));
        fireEvent.click(screen.getByRole("button", { name: "Update Blog" }));
        await waitFor(() => expect(hooks.updateBlog).toHaveBeenCalledOnce());
        expect(hooks.updateBlog.mock.calls[0][0].coverImage).toBe(blog.coverImage);
    });

    test("ignores file cancellation and allows retrying after an unsupported file", async () => {
        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ fileUrl: "https://storage.example.com/cover.png" }));
        vi.stubGlobal("fetch", fetchMock);
        renderForm();
        const input = screen.getByLabelText("Cover image");
        fireEvent.change(input, { target: { files: [] } });
        expect(fetchMock).not.toHaveBeenCalled();
        fireEvent.change(input, { target: { files: [new File(["text"], "file.txt", { type: "text/plain" })] } });
        expect(await screen.findByRole("alert")).toHaveTextContent("Choose an SVG, PNG, JPG, or WebP image.");
        expect(fetchMock).not.toHaveBeenCalled();
        fireEvent.change(input, { target: { files: [new File(["image"], "cover.png", { type: "image/png" })] } });
        expect(await screen.findByRole("img", { name: "Blog cover preview" })).toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
});
