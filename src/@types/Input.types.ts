import z from "zod";
import { UseFormRegisterReturn } from "react-hook-form";

export const InputTypeSchema = z.object({
    label: z.string().optional(),
    error: z.string().optional()
});

export type InputType = z.infer<typeof InputTypeSchema> & React.InputHTMLAttributes<HTMLInputElement> & {
  register?: UseFormRegisterReturn
};
