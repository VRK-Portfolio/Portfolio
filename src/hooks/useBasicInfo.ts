import { ApiGetResponse } from "@/@types/ApiResponse.types";
import { BasicInfoSchema, BasicInfoType } from "@/@types/BasicInfo.types";
import { useQuery } from "@tanstack/react-query";
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
            return z.array(BasicInfoSchema).parse(res.data)[0];
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