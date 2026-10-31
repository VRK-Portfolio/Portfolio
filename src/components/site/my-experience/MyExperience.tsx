import SectionHeading from "@/block/site/section-heading/section-heading"
import Badge from "@/block/ui/badge/Badge"
import './experience.css';
import { useDeleteExperience, useGetExpericence } from "@/hooks/useExperience";
import { formatDate } from "@/libs/utils";
import Button from "@/block/ui/button/Button";
import Card from "@/block/ui/card/Card";
import { ExperienceType } from "@/@types/Experience.types";


const ExperienceDetails = ({ experience }: { experience: ExperienceType}) => {
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
                        <h4 className="cmp-my-experience__role text-lg">{position.role}</h4>
                        <p className="cmp-my-experience__duration">{formatDate(position.startDate)} - {position.endDate ? formatDate(position.endDate) : 'Present'}</p>
                        <p className="cmp-my-experience__description">{position.description}</p>
                    </div>
                ))
            }

        </li>
    )
}
export const MyExperienceComponent = ({ className = '', type = 'site', modalOpen }: { className?: string, type?: 'admin' | 'site', modalOpen?: (id?: string) => void }) => {
    const { experienceList, totalExperience } = useGetExpericence();
    const {deleteExperience} = useDeleteExperience();

    return (
        <>
            <section className={`cmp-my-experience ${className} ${type === 'admin' ? 'cmp-admin__type' : ''}`}>
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
                                        <ExperienceDetails key={experience._id} experience={experience} />
                                    )
                            })
                        }
                    </ul>
                </div>
            </section>
        </>
    )
}