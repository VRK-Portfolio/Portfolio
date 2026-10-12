import Badge from "@/block/ui/badge/Badge";
import Card from "@/block/ui/card/Card"
import Link from "next/link";
import './project-listing.css'
import { truncateText } from "@/libs/utils";
import { useEffect, useState } from "react";
import { ProjectType } from "@/@types/Projects.types";
import Button from "@/block/ui/button/Button";
import SectionHeading from "@/block/site/section-heading/section-heading";
import { MoveUpRight } from "lucide-react";



const ProjectListingComponent = ({ maxCount, className }: { maxCount?: number, className?: string }) => {

    const [projects, setProjects] = useState<ProjectType[]>([]);
    const [error, setError] = useState<string | null>(null);

    const fetchProject = async () => {
        const response = await fetch('/api/projects')
        try {
            const data = await response.json();
            if (!response.ok) {
                throw new Error('Failed to fetch projects');
            }
            if (!data.success) {
                throw new Error('Failed to fetch projects');
            }

            if (maxCount !== undefined) {
                setProjects(data.data.slice(0, maxCount));
            } else {
                setProjects(data.data);
            }
        } catch (error) {
            setError('Failed to fetch projects');
        }
    }

    useEffect(() => {
        const fetchData = async () => {
            await fetchProject();
        }
        fetchData();
    }, []);

    if (error) {
        return (
            <section className="cmp-project-listing">
                <p className="cmp-project-listing__error">{error}</p>
            </section>
        );
    }
    return (
        <section className={`cmp-project-listing ${className ?? ''}`}>
            <div className="container">
                <SectionHeading title="Projects" subtitle="Check out some of my recent work" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects?.map(project => (
                        <Card Tag="article" key={project.id}>
                            <Card.Image imageUrl={project.image_url} />
                            <Card.Heading>{project.title}</Card.Heading>
                            <Card.Body>
                                <div className="cmp-project-listing__technologies">
                                    {project.technologies.map(tech => (
                                        <Badge key={tech}>{tech}</Badge>
                                    ))}
                                </div>
                                <p>
                                    {truncateText(project.description)}
                                </p>
                            </Card.Body>
                            <Card.Footer>
                                <Link className="cmp-project-listing__link-detail" href={`/projects/${project.id}`} target="_blank" rel="noopener noreferrer">
                                    Click Here
                                    <span>
                                        <MoveUpRight className="size-4" />
                                        <span className="sr-only">View Project in new tab</span>
                                    </span>
                                </Link>
                            </Card.Footer>
                        </Card>
                    ))}
                </div>

                <div className="cmp-project-listing__view-more">
                    {
                        maxCount !== undefined &&
                        projects.length >= maxCount && (
                            <Button >
                                View More
                            </Button>
                        )
                    }
                </div>

            </div>
        </section>
    )
}

export default ProjectListingComponent;
