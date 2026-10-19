import { ApiGetResponse } from "@/@types/ApiResponse.types";
import { MySkillsSchema, MySkillsType } from "@/@types/MySkills.types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import z from "zod";

export const useSkills = () => {
    const query = useQuery({
        queryKey: ['skills'],
        queryFn: async(): Promise<MySkillsType[]> => {
            const response = await fetch('/api/my-skills');
            if (!response.ok) {
                throw new Error('Failed to fetch skills');
            }
            const res:ApiGetResponse<MySkillsType[]> = await response.json();
            if(!res.success) {
                throw new Error('Failed to fetch skills');
            }
            return z.array(MySkillsSchema).parse(res.data);
        }
    });
    return {
        skills: query.data ?? [],
        skillsCount: query.data?.length ?? 0,
        isSkillsLoading: query.isLoading,
        isSkillsError: query.isError,
        skillsError: query.error,
        refetch: query.refetch,
    };
};


export const useDeleteSkills = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/my-skills/${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                throw new Error('Failed to delete skill');
            }
            const res: ApiGetResponse<null> = await response.json();
            if (!res.success) {
                throw new Error('Failed to delete skill');
            }
            return res.data;
        },
        onSuccess: () => {
            // Automatically refetch the skills list
            queryClient.invalidateQueries({ queryKey: ['skills'] });
        },
    });

    return {
        deleteSkill: mutation.mutate,
        isDeleting: mutation.isPending,
        isDeleteError: mutation.isError,
        deleteError: mutation.error,
    };
};


export const useCreateSkill = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (data: MySkillsType) => {
            let iconUrl = typeof data.icon === 'string' ? data.icon : '';

            const fileList = data.icon as unknown as FileList;
            const fileToUpload = fileList?.[0];
            if(data.icon) {
                const uploadForm = new FormData();
                uploadForm.append('file', fileToUpload);
                const uploadResponse = await fetch('/api/upload', {
                    method: 'POST',
                    body: uploadForm,
                });
                if (!uploadResponse.ok) {
                    throw new Error('Failed to upload icon');
                }
                const uploadRes = await uploadResponse.json();
                iconUrl = uploadRes.fileUrl;

            }
            const newSkill = { ...data, icon: iconUrl };

            const response = await fetch('/api/my-skills', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newSkill),
            });
            if (!response.ok) {
                throw new Error('Failed to create skill');
            }
            const res: ApiGetResponse<MySkillsType> = await response.json();
            if (!res.success) {
                throw new Error('Failed to create skill');
            }
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['skills'] });
        },
    });

    return {
        createSkill: mutation.mutate,
        isCreating: mutation.isPending,
        isCreateError: mutation.isError,
        createError: mutation.error,
    };
}


export const useUpdateSkill = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (data: MySkillsType) => {
            let iconUrl = typeof data.icon === 'string' ? data.icon : '';

            const fileList = data.icon as unknown as FileList;
            const fileToUpload = fileList?.[0];
            if(fileToUpload instanceof File) {
                const uploadForm = new FormData();
                uploadForm.append('file', fileToUpload);
                const uploadResponse = await fetch('/api/upload', {
                    method: 'POST',
                    body: uploadForm,
                });
                if (!uploadResponse.ok) {
                    throw new Error('Failed to upload icon');
                }
                const uploadRes = await uploadResponse.json();
                iconUrl = uploadRes.fileUrl;
            }
            const updatedSkill = { ...data, icon: iconUrl };

            const response = await fetch(`/api/my-skills/${data._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedSkill),
            });
            if (!response.ok) {
                throw new Error('Failed to update skill');
            }
            const res: ApiGetResponse<MySkillsType> = await response.json();
            if (!res.success) {
                throw new Error('Failed to update skill');
            }
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['skills'] });
        },
    });

    return {
        updateSkill: mutation.mutate,
        isUpdating: mutation.isPending,
        isUpdateError: mutation.isError,
        updateError: mutation.error,
    };
}