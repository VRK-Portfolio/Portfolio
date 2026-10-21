'use client';
import { useSkills } from "@/hooks/useSkills";
import { ArrowLeft, ArrowRight, Award, BookOpen, BriefcaseBusiness, Code, FileUser, LayoutDashboard, Library, Newspaper } from "lucide-react";
import Badge from "@/block/ui/badge/Badge";
import { useMemo, useState } from "react";
import { SidebarType } from "../../../@types/Sidebar.types";
import Link from "next/link";
import Button from "@/block/ui/button/Button";
import './sidebar.css';
import {useCertifications} from "@/hooks/useCertifications";

const SIDEBAR_MENU: SidebarType[] = [{
    title: "MAIN",
    items: [
        {
            href: "/admin/dashboard",
            icon: LayoutDashboard,
            text: "Dashboard",
        }
    ]
}, {
    title: "Content Management",
    items: [
        {
            href: "/admin/basic-info",
            icon: FileUser,
            text: "Basic Information"
        },
        {
            href: "/admin/skills",
            icon: Code,
            text: "Skills",
            badge: "{{skillsCount}} Skills"
        },
        {
            href: "/admin/certifications",
            icon: Award,
            text: "Certifications",
            badge: "{{certificationCount}} Certs"
        },
        {
            href: "/admin/projects",
            icon: BriefcaseBusiness,
            text: "Projects & Works",
            badge: `1 Proj`
        },
        {
            href: "/admin/blogs",
            icon: BookOpen,
            text: "Blog Articles",
            badge: "5 Articles"
        },
        {
            href: "/admin/Whitepapers",
            icon: Newspaper,
            text: "Whitepapers",
            badge: "8 Papers"
        },
        {
            href: "/admin/case-studies",
            icon: Library,
            text: "Case Studies",
            badge: "8 Studies"
        }
    ]
}];

const BADGE_CLASSES = ["", "success", "secondary", "danger", "warning", "info"];
const Sidebar = ({className = ''}: {className?: string}) => {
    const [collapsed, setCollapsed] = useState<boolean>(false);
    const { skillsCount } = useSkills();
    const {certificationCount} = useCertifications();
    const toggleCollapse = () => {
        setCollapsed(!collapsed);
    };

    const updateBadge = useMemo(() => {
        return SIDEBAR_MENU.map((section) => ({
            ...section,
            items: section.items.map((item) => {
                
                if (item.badge?.includes("{{skillsCount}}")) {
                return { ...item, badge: `${skillsCount} Skills` };
                }

                if(item.badge?.includes("{{certificationCount}}")) {
                    return { ...item, badge: `${certificationCount} Certs` };
                }
                return item;
            }),
            }));
    }, [skillsCount, certificationCount]);

    return (
        <>
            <aside className={`cmp-sidebar ${collapsed ? 'cmp-sidebar--collapse' : ''} ${className}`}>
                <div className="cmp-sidebar--header">
                    <span className="cmp-sidebar--header-initials">VRK</span>
                    <h2 className="cmp-sidebar--header-title">Admin Panel</h2>
                </div>
                <nav className="cmp-sidebar--nav">
                    <ul>
                        {
                            updateBadge.map((section, index) => (
                                <li key={index} className="cmp-sidebar--section">
                                    <p className="cmp-sidebar--section-title">{section.title}</p>
                                    <ul>
                                        {section.items.map((item, itemIndex) => (
                                            <li key={itemIndex} className="cmp-sidebar--section-item">
                                                <Link className="cmp-sidebar--link" href={item?.href}>
                                                    <span className="cmp-sidebar--link-content">
                                                        <item.icon className="cmp-sidebar--link-icon" size="20" />
                                                        <span className="cmp-sidebar--link-text">{item.text}</span>
                                                    </span>
                                                    {
                                                        item.badge && <Badge className={`cmp-badge cmp-badge--${BADGE_CLASSES[itemIndex]}`}>{item.badge}</Badge>
                                                    }
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </li>
                            ))
                        }
                    </ul>
                </nav>
                <div className="cmp-sidebar--footer">
                    <Button className="cmp-sidebar--footer-button" size="small" onClick={toggleCollapse}>
                        {
                            collapsed ? <ArrowRight size="16" /> : <ArrowLeft size="16" />
                        }
                        <span className="cmp-sidebar--footer-button-text">{collapsed ? "Expand Sidebar" : "Collapse Sidebar"}</span>
                    </Button>
                </div>
            </aside>
        </>
    )
}

export default Sidebar;
