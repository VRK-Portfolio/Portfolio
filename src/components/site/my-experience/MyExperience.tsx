import SectionHeading from "@/block/site/section-heading/section-heading"
import Badge from "@/block/ui/badge/Badge"
import './experience.css';
import { useDeleteExperience, useGetExpericence } from "@/hooks/useExperience";
import { formatDate } from "@/libs/utils";
import Button from "@/block/ui/button/Button";
import Card from "@/block/ui/card/Card";
import { ExperienceType } from "@/@types/Experience.types";
import ExperienceLoading from "./ExperienceLoading";
import StructuredData from "@/components/site/structured-data/StructuredData";
import { experienceStructuredData } from "@/libs/structured-data";


const normalizeDescription = (description: string) => description.replace(/\s+/g, " ").trim();

const ExperienceDetails = ({ experience, sharedDescriptions }: { experience: ExperienceType; sharedDescriptions?: ReadonlySet<string> }) => {
    const RoleTitle = sharedDescriptions ? 'p' : 'h4';
    return (
        <li key={experience._id} className="cmp-my-experience__item">
            <h3 className="cmp-my-experience__company">{experience.company}</h3>
            <p className="cmp-my-experience__duration">{formatDate(experience.positions[0].startDate)} - {experience.positions[experience.positions.length - 1].endDate ? formatDate(experience.positions[experience.positions.length - 1].endDate) : 'Present'}</p>
            <p className="cmp-my-experience__location text-sm">{experience.location}</p>
            <div className="cmp-my-experience__skill-list flex gap-3 my-4 flex-wrap">
                {experience.responsibilites.map((skill, index) => (
                    <Badge key={index}>{skill}</Badge>
                ))}
            </div>
            {
                experience.positions.map((position, index) => (
                    <div key={index} className="cmp-my-experience__role-container mb-3">
                        <RoleTitle className="cmp-my-experience__role text-lg font-bold">{position.role}</RoleTitle>
                        <p className="cmp-my-experience__duration">{formatDate(position.startDate)} - {position.endDate ? formatDate(position.endDate) : 'Present'}</p>
                        {!sharedDescriptions?.has(normalizeDescription(position.description)) && (
                            <p className="cmp-my-experience__description">{position.description}</p>
                        )}
                    </div>
                ))
            }

        </li>
    )
}
export const MyExperienceComponent = ({ className = '', type = 'site', modalOpen }: { className?: string, type?: 'admin' | 'site', modalOpen?: (id?: string) => void }) => {
    const { experienceList, totalExperience, isLoading, isError, error } = useGetExpericence();
    const {deleteExperience} = useDeleteExperience();

    if (type === 'site' && isLoading) {
        return <ExperienceLoading className={className} />;
    }

    if (type === 'site' && isError) {
        return (
            <section id="Experience" className={`cmp-my-experience ${className}`}>
                <div className="container">
                    <p role="alert">{error?.message}</p>
                </div>
            </section>
        );
    }

    const descriptionGroups = new Map<string, { description: string; roles: string[] }>();
    if (type === 'site') {
        for (const experience of experienceList) {
            for (const position of experience.positions) {
                const description = normalizeDescription(position.description);
                if (!description) continue;
                const group = descriptionGroups.get(description) ?? { description: position.description, roles: [] };
                group.roles.push(`${experience.company}: ${position.role}`);
                descriptionGroups.set(description, group);
            }
        }
    }
    const sharedGroups = [...descriptionGroups.entries()].filter(([, group]) => group.roles.length > 1);
    const sharedDescriptions = new Set(sharedGroups.map(([description]) => description));

    return (
        <>
            <section id="Experience" className={`cmp-my-experience ${className} ${type === 'admin' ? 'cmp-admin__type' : ''}`}>
                {type === 'site' && experienceList.length > 0 && <StructuredData data={experienceStructuredData(experienceList)} />}
                {
                    type === 'admin' ? (
                        <>
                        <div className="container">
                            <div className="cmp-admin__heading-actions">
                                <SectionHeading
                                    title="Admin Experience"
                                    subtitle="Manage your site effectively"
                                />
                                <Button variant="primary" className='cmp-my-skills__add-skill w-40' onClick={() => modalOpen?.()}>Add Experience</Button>
                            </div>
                        </div>
                        </>
                    ) : (
                        <>
                            <div className="container pl-20!">
                                <SectionHeading
                                    title="My Experience"
                                    subtitle={`Full-Stack Developer with <strong>${totalExperience}+ years of expertise</strong> in architecting scalable, efficient systems`}
                                />
                            </div>
                        </>
                    )
                }
                <div className={`container ${type !== 'admin' ? 'pl-20!' : ''}`}>
                    {sharedGroups.length > 0 && (
                        <div className="mb-6">
                            <p className="font-bold mb-3">Shared responsibilities across roles</p>
                            {sharedGroups.map(([description, group]) => (
                                <div key={description} className="mb-4">
                                    <p className="cmp-my-experience__description">{group.description}</p>
                                    <ul className="mt-2 list-disc pl-5 text-sm">
                                        {group.roles.map((role, index) => <li key={`${role}-${index}`}>{role}</li>)}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                    <ul className="cmp-my-experience__list">
                        {
                            experienceList.map((experience) => {
                                    return type === 'admin' ? ( 
                                        <Card key={experience._id} className="py-3">
                                            <Card.Body>
                                                <ExperienceDetails key={experience._id} experience={experience} />
                                            </Card.Body>
                                            <Card.Footer>
                                                <div className="flex gap-3">
                                                    <Button variant="primary" className='w-40' outline onClick={() => modalOpen?.(experience._id)}>Edit</Button>
                                                    <Button variant="danger" className='w-40' outline onClick={() => deleteExperience(experience._id as string)}>Delete</Button>
                                                </div>
                                            </Card.Footer>
                                        </Card>
                                    ) : (
                                        <ExperienceDetails key={experience._id} experience={experience} sharedDescriptions={sharedDescriptions} />
                                    )
                            })
                        }
                    </ul>
                </div>
            </section>
        </>
    )
}