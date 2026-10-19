import { LucideIcon } from "lucide-react";
import React, { ReactElement } from "react";
import z from "zod";

// Define a union type for what an icon prop can accept:
// Either a Lucide icon component reference (e.g. User) OR a rendered React element (<User />)
export type IconProp = LucideIcon;

export const iconSchema = z.custom<IconProp>(
  (val) => typeof val === "function" || React.isValidElement(val),
  { message: "Must be a valid Lucide icon component or React element" }
);

export const SidebarSchema = z.object({
    title: z.string(),
    items: z.array(z.object({
        href: z.string(),
        icon: iconSchema,
        text: z.string(),
        badge: z.string().optional()
    }))
});

export type SidebarType = z.infer<typeof SidebarSchema>;