import { ApiGetResponse, ApiPostResponse } from "@/@types/ApiResponse.types";
import { ExperiencePropsSchema, ExperienceType } from "@/@types/Experience.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export const useGetExpericence = () => {
    const query = useQuery({
        queryKey: ['experience'],
        queryFn: async () => {
            const response = await fetch('/api/experience');
            if (!response.ok) {
                throw new Error('Failed to fetch experience');
            }
            const data: ApiGetResponse<ExperienceType[]> = await response.json();
            if (!data.success) {
                throw new Error('Failed to fetch experience');
            }
            return ExperiencePropsSchema.array().parse(data.data.sort((a, b) => {
                const aStart = new Date(a.positions[0]?.startDate || 0);
                const bStart = new Date(b.positions[0]?.startDate || 0);
                a.positions.sort((x, y) => new Date(y.startDate).getTime() - new Date(x.startDate).getTime());
                b.positions.sort((x, y) => new Date(y.startDate).getTime() - new Date(x.startDate).getTime());
                return bStart.getTime() - aStart.getTime();
            }));
        }
    })

    const totalExperience = () => {
        const experiences = query.data || [];
        let total = 0;
        experiences.forEach(experience => {
            experience.positions.forEach(position => {
                const start = new Date(position.startDate);
                let end = position.endDate ? new Date(position.endDate) : new Date();
                if(position.isCurrentPosition) {
                    end = new Date();
                }
                total += (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
            });
        });
        return Math.round((total/12)); 
    }

    return {
        experienceList: query.data || [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        totalExperience: totalExperience()
    };
}


export const useCreateExperience = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (newExperience: ExperienceType) => {
            const response = await fetch('/api/experience', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newExperience)
            });
            const data: ApiPostResponse = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(!data.success ? data.error : 'Failed to create experience');
            }
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['experience'] });
        }
    })
    return {
        addExperience: mutation.mutate,
        isLoading: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
    };
}


export const useUpdateExperience = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (updatedExperience: ExperienceType) => {
            const response = await fetch(`/api/experience/${updatedExperience._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedExperience)
            });
            const data: ApiPostResponse = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(!data.success ? data.error : 'Failed to update experience');
            }
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['experience'] });
        }
    });

    return {
        updateExperience: mutation.mutate,
        isLoading: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
    };
}


export const useDeleteExperience = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (experienceId: string) => {
            const response = await fetch(`/api/experience/${experienceId}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                throw new Error('Failed to delete experience');
            }
            const data = await response.json();
            if (!data.success) {
                throw new Error('Failed to delete experience');
            }
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['experience'] });
        }
    });

    return {
        deleteExperience: mutation.mutate,
        isLoading: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
    };
}