import SectionHeading from '@/block/site/section-heading/section-heading';
import './my-skills.css';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { MySkillsType } from '@/@types/MySkills.types';


const MySkillsComponent = ({className}: {className?: string}) => {

    const [mySkills, setMySkills] = useState<MySkillsType[]>([]);

    useEffect(() => {
        const fetchMySkills = async () => {
            const response = await fetch('/api/my-skills');
            const data = await response.json();
            if (data.success) {
                setMySkills(data.data);
            }
        }
        fetchMySkills();
    }, []);
    return (
        <section className={`cmp-my-skills ${className ? className : ''}`}>
            <div className="container">
                <SectionHeading title='My Skills' subtitle='Skilled full-stack engineer developing efficient frontend, backend, and database solutions.' />
                <ul className='cmp-my-skills__list grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6'>
                    {mySkills.map((skill) => (
                        <li key={skill.name} className='cmp-my-skills__list-item'>
                            <Image
                                src={skill.icon}
                                alt={`${skill.name} Skill Icon`}
                                width={75}
                                height={75}
                            />
                            <p className='cmp-my-skills__list-item-title'>{skill.name}</p>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
};

export default MySkillsComponent;