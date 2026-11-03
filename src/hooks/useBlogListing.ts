import { ApiGetResponse, ApiPostResponse } from "@/@types/ApiResponse.types";
import { BlogListingSchema, BlogListingType, BlogWriteType } from "@/@types/Blogs.types";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ParamValue } from "next/dist/server/request/params";

export const useBlogListing = (recent?: ParamValue) => {
    const query = useQuery({
        queryKey: ["blogListing", recent],
        queryFn: async () => {
            const response = await fetch(`/api/blogs`, {
                method: "GET",
                ...(recent ? { headers: { "X-Recent": recent.toString() } } : {})
            });
            if (!response.ok) {
                throw new Error("Failed to fetch blogs");
            }

            const res: ApiGetResponse<BlogListingType[]> = await response.json();

            if (!res.success) {
                throw new Error(res.error || "Failed to fetch blogs");
            }

            const data = res.data.map(item => {
                return {
                    ...item,
                    createdAt: new Date(item.createdAt as Date),
                    updatedAt: new Date(item.updatedAt as Date),
                }
            })
            const parsed = z.array(BlogListingSchema).parse(data);
            return parsed;
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


export const useBlogById = (id?: ParamValue) => {
    const query = useQuery({
        queryKey: ["blogDetail", id],
        queryFn: async () => {
            const response = await fetch(`/api/blogs/${id}`);
            if (!response.ok) {
                throw new Error("Failed to fetch blog detail");
            }
            const res: ApiGetResponse<BlogListingType> = await response.json();
            if (!res.success) {
                throw new Error(res.error || "Failed to fetch blog detail");
            }
            return res.data;
        }
    });
    return {
        blogDetail: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
    };
};