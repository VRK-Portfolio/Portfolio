import SectionHeading from "@/block/site/section-heading/section-heading";
import Card from "@/block/ui/card/Card";

const SkillLoading = ({type}: {type?: 'admin' | 'site'}) => {
    return (
        <section className={`cmp-my-skills ${type === 'admin' ? 'cmp-my-skills--admin' : ''}`}>
            <div className="container">
                <SectionHeading title='My Skills' subtitle='Skilled full-stack engineer developing efficient frontend, backend, and database solutions.' />
                <ul className='cmp-my-skills__list grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 animate-pulse'>
                    {new Array(6).fill(null).map((_, key) => (
                        <li key={key} className='cmp-my-skills__list-item'>
                            <Card darkType='pure'>
                                <Card.Body>
                                    <div className='cmp-my-skills__content'>
                                        <div
                                            className='shimmer size-12'
                                        ></div>
                                        <div className='cmp-my-skills__content-heading'>
                                            <div className='cmp-my-skills__list-item-title shimmer w-25 h-2 mb-1'></div>
                                            <div className='cmp-my-skills__list-item-category w-20 h-2 shimmer'></div>
                                        </div>
                                    </div>
                                    <div className='cmp-my-skills__content-capabilities gap-2 inline-flex'>
                                        {new Array(3).fill(null).map((_, key) => (
                                            <div key={key} className='shimmer h-4 w-20'></div>
                                        ))}
                                    </div>
                                </Card.Body>
                            </Card>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
};

export default SkillLoading;