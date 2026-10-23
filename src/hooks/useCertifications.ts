import { ApiGetResponse, ApiPostResponse } from "@/@types/ApiResponse.types";
import { CertificationSchema, CertificationType } from "@/@types/Certification.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import z from "zod";

export const useCertifications = () => {
    const query = useQuery({
        queryKey: ['certifications'],
        queryFn: async () => {
            const response = await fetch('/api/certifications');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const res: ApiGetResponse<CertificationType[]> = await response.json();
            if (res.success) {
                const data = res.data.map(item => ({
                    ...item,
                    issueDate: new Date(item.issueDate),
                    expirationDate: new Date(item.expirationDate),
                }));
                return z.array(CertificationSchema).parse(data);
            } else {
                throw new Error('Failed to fetch certifications');
            }
        }
    });

    return {
        certifications: query.data || [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        certificationCount: query.data?.length || 0,
    };
};

export const useAddCertification = () => {
    const queryClient = useQueryClient();
    const mutation = useMutation({
        mutationFn: async (data: CertificationType) => {
            const response = await fetch('/api/certifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const res: ApiPostResponse = await response.json();
            if (res.success) {
                return res;
            } else {
                throw new Error('Failed to add certification');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['certifications'] });
        }
    });
    return {
        addCertification: mutation.mutate,
        isLoading: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
    };
};


export const useUpdateCertifications = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (data: CertificationType) => {
            const response = await fetch(`/api/certifications/${data._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const res: ApiPostResponse = await response.json();
            if (res.success) {
                return res;
            } else {
                throw new Error('Failed to update certification');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['certifications'] });
        }
    });
    return {
        updateCertification: mutation.mutate,
        isLoading: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
    };
}


export const useDeleteCertifications = () => {
    const queryClient = useQueryClient();
    const mutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/certifications/${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const res: ApiPostResponse = await response.json();
            if (res.success) {
                return res;
            } else {
                throw new Error('Failed to delete certification');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['certifications'] });
        }
    });
    return {
        deleteCertification: mutation.mutate,
        isLoading: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
    };
}