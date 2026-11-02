import { ApiGetResponse, ApiPostResponse } from "@/@types/ApiResponse.types";
import { BlogListingSchema, BlogListingType, BlogWriteType } from "@/@types/Blogs.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useBlogListing = () => {
    const query = useQuery({
        queryKey: ["blogListing"],
        queryFn: async () => {
            const response = await fetch("/api/blogs");
            if (!response.ok) {
                throw new Error("Failed to fetch blogs");
            }

            const res: ApiGetResponse<BlogListingType[]> = await response.json();

            if (!res.success) {
                throw new Error(res.error || "Failed to fetch blogs");
            }
            const parsed = BlogListingSchema.array().safeParse(res.data);
            if (!parsed.success) throw new Error("Invalid blog listing data");
            return parsed.data;
        }
    });
    return {
        blogs: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        blogCount: query.data?.length ?? 0,
    };
};

const writeBlog = async (url: string, method: "POST" | "PUT" | "DELETE", blog?: BlogWriteType) => {
    const response = await fetch(url, {
        method,
        ...(blog ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(blog) } : {}),
    });
    const data: ApiPostResponse = await response.json();
    if (!response.ok || !data.success) {
        throw new Error(!data.success && data.error ? data.error : "Failed to save blog changes");
    }
    return data;
};

export const useCreateBlog = () => {
    const client = useQueryClient();
    const mutation = useMutation({
        mutationFn: (blog: BlogWriteType) => writeBlog("/api/blogs", "POST", blog),
        onSuccess: () => client.invalidateQueries({ queryKey: ["blogListing"] }),
    });
    return { createBlog: mutation.mutate, isCreating: mutation.isPending };
};

export const useUpdateBlog = () => {
    const client = useQueryClient();
    const mutation = useMutation({
        mutationFn: ({ _id, ...blog }: BlogWriteType & { _id: string }) => writeBlog(`/api/blogs/${_id}`, "PUT", blog),
        onSuccess: () => client.invalidateQueries({ queryKey: ["blogListing"] }),
    });
    return { updateBlog: mutation.mutate, isUpdating: mutation.isPending };
};

export const useDeleteBlog = () => {
    const client = useQueryClient();
    const mutation = useMutation({
        mutationFn: (id: string) => writeBlog(`/api/blogs/${id}`, "DELETE"),
        onSuccess: () => client.invalidateQueries({ queryKey: ["blogListing"] }),
    });
    return {
        deleteBlog: mutation.mutate,
        isDeleting: mutation.isPending,
        deletingId: mutation.variables,
        deleteError: mutation.error,
    };
};
