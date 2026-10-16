import z from "zod";
import { UseFormRegisterReturn } from "react-hook-form";

const InputProps = z.object({
    label: z.string().optional(),
    error: z.string().optional(),
   
});

export type InputProps = z.infer<typeof InputProps> & React.InputHTMLAttributes<HTMLInputElement> & {
  register?: UseFormRegisterReturn
};
