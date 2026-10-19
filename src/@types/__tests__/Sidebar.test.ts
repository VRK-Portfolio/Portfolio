import { describe, expect, test } from "vitest";
import z from "zod";
import { SidebarSchema, SidebarType } from "../Sidebar.types";
import { LayoutDashboard } from "lucide-react";

describe("SidebarType", () => {
    test("invalid sidebar menu should throw an error", () => {
        const invalidSidebarMenu = [{
            title: "Sidebar Item 1",
            items: [{
                icon: LayoutDashboard,
                href: '',
                text: 'Dummy Link',
                badge: '{{proj}} Projects'
            }]
        }];
        const sidebarMenuSchema = z.array(SidebarSchema);
        expect(() => sidebarMenuSchema.parse(invalidSidebarMenu)).toThrow();
    });

    test("empty sidebar menu should be valid", () => {
        const emptySidebarMenu: SidebarType[] = [];
        const sidebarMenuSchema = z.array(SidebarSchema);
        const response = sidebarMenuSchema.parse(emptySidebarMenu);
        expect(response).toEqual(emptySidebarMenu);
    });

    test("sidebar menu with missing fields should throw an error", () => {
        const incompleteSidebarMenu = [{
            title: "Sidebar Item 1"
        }];
        const sidebarMenuSchema = z.array(SidebarSchema);
        expect(() => sidebarMenuSchema.parse(incompleteSidebarMenu)).toThrow();
    });
});