import { ApiGetResponse, ApiPostResponse } from "@/@types/ApiResponse.types";
import { BasicInfoSchema, BasicInfoType } from "@/@types/BasicInfo.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import z from "zod";

export const useBasicInfo = () => {
    const query = useQuery({
        queryKey: ['basicInfo'],
        queryFn: async (): Promise<BasicInfoType> => {
            const response = await fetch('/api/basic-info');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const res: ApiGetResponse<BasicInfoType[]> = await response.json();
            if (!res.success) {
                throw new Error('Failed to fetch basic info');
            }
            return z.array(BasicInfoSchema).parse(res.data)[0] || null;
        }
    })
    return {
        basicInfo: query.data ?? null,
        isBasicInfoLoading: query.isLoading,
        isBasicInfoError: query.isError,
        basicInfoError: query.error,
        refetch: query.refetch,
    };
};

export const useUpdateBasicInfo = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (data: BasicInfoType) => {
            let iconUrl = typeof data.avatar_url === 'string' ? data.avatar_url : '';
            let faviconUrl = typeof data.favicon_url === 'string' ? data.favicon_url : '';
            const fileList = data.avatar_url as unknown as FileList;
            const fileToUpload = fileList?.[0];
            const fileListFavicon = data.favicon_url as unknown as FileList;
            const fileToUploadFavicon = fileListFavicon?.[0];
            if(data.favicon_url && fileToUploadFavicon instanceof File) {
                const uploadForm = new FormData();
                uploadForm.append('file', fileToUploadFavicon);
                const uploadResponse = await fetch('/api/upload', {
                    method: 'POST',
                    body: uploadForm,
                });
                if (!uploadResponse.ok) {
                    throw new Error('Failed to upload favicon');
                }
                const uploadRes = await uploadResponse.json();
                faviconUrl = uploadRes.fileUrl;
            } 
            
            if(data.avatar_url && fileToUpload instanceof File) {
                const uploadForm = new FormData();
                uploadForm.append('file', fileToUpload);
                const uploadResponse = await fetch('/api/upload', {
                    method: 'POST',
                    body: uploadForm,
                });
                if (!uploadResponse.ok) {
                    throw new Error('Failed to upload avatar');
                }
                const uploadRes = await uploadResponse.json();
                iconUrl = uploadRes.fileUrl;
            }

            const basicInfo = { ...data, avatar_url: iconUrl, favicon_url: faviconUrl };
            const response = await fetch(`/api/basic-info/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(basicInfo),
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const res: ApiPostResponse = await response.json();
            if (res.success) {
                return res;
            } else {
                throw new Error('Failed to update basic info');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['basicInfo'] });
        }
    });
    return {
        updateBasicInfo: mutation.mutate,
        isLoading: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
    };
};