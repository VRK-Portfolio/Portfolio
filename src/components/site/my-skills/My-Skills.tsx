import SectionHeading from '@/block/site/section-heading/section-heading';
import './my-skills.css';
import Image from 'next/image';
import { useDeleteSkills, useSkills } from '@/hooks/useSkills';
import SkillLoading from './SkillLoading';
import Card from '@/block/ui/card/Card';
import Badge from '@/block/ui/badge/Badge';
import Button from '@/block/ui/button/Button';


const MySkillsComponent = ({ className, type = 'site', modalOpen }: { className?: string, type?: 'admin' | 'site', modalOpen?: (id?: string | undefined) => void }) => {

    const { skills, isSkillsLoading } = useSkills();
    const { deleteSkill, isDeleting } = useDeleteSkills();
    if (isSkillsLoading) {
        return <SkillLoading type={type} />;
    }
    return (
        <section className={`cmp-my-skills ${className ? className : ''} ${type === 'admin' ? 'cmp-admin__type' : ''}`}>

            <div className="container">
                {
                    type === 'site' && (
                        <>
                            <SectionHeading title='My Skills' subtitle='Skilled full-stack engineer developing efficient frontend, backend, and database solutions.' />
                        </>
                    )
                }
                {
                    type === 'admin' && (
                        <>
                            <div className="cmp-admin__heading-actions">
                                <SectionHeading title='Admin View of My Skills' subtitle='Manage and oversee all skills efficiently.' Tag={'h4'} />
                                <Button variant="primary" className='cmp-my-skills__add-skill w-40' onClick={() => modalOpen?.()}>Add Skill</Button>
                            </div>
                        </>
                    )
                }
                <ul className='cmp-my-skills__list grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'>
                    {skills.map((skill) => (
                        <li key={skill.name} className='cmp-my-skills__list-item'>
                            <Card darkType='pure' className='flex w-full flex-col items-stretch h-full justify-between'>
                                <Card.Body>
                                    <div className='cmp-my-skills__content'>
                                        <Image
                                            src={skill.icon as string}
                                            alt={`${skill.name} Skill Icon`}
                                            width={50}
                                            height={50}
                                        />
                                        <div className='cmp-my-skills__content-heading'>
                                            <h3 className='cmp-my-skills__list-item-title'>{skill.name}</h3>
                                            <p className='cmp-my-skills__list-item-category'>{skill.category}</p>
                                        </div>
                                    </div>
                                    <div className='cmp-my-skills__content-capabilities gap-2 inline-flex flex-wrap'>
                                        {skill.capabilities.map((capability) => (
                                            <Badge key={capability} className='cmp-my-skills__list-item-capability'>{capability}</Badge>
                                        ))}
                                    </div>
                                </Card.Body>
                                {
                                    type === 'admin' && (
                                        <Card.Footer>
                                            <div className="flex gap-2">
                                                <Button className='cmp-my-skills__list-item-action w-1/2' outline onClick={() => modalOpen?.(skill._id!)}>Edit</Button>
                                                <Button className='cmp-my-skills__list-item-action w-1/2' variant='danger' outline onClick={() => deleteSkill(skill._id!)} disabled={isDeleting}>
                                                    {isDeleting ? 'Deleting...' : 'Delete'}
                                                </Button>
                                            </div>
                                        </Card.Footer>
                                    )
                                }

                            </Card>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
};

export default MySkillsComponent;