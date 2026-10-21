import SectionHeading from "@/block/site/section-heading/section-heading"
import Badge from "@/block/ui/badge/Badge"
import './experience.css';
export const MyExperienceComponent = ({ className = '', type = 'site' }: { className?: string, type?: 'admin' | 'site' }) => {
    return (
        <>
            <section className={`cmp-my-experience section ${className} ${type === 'admin' ? 'cmp-admin__type' : ''}`}>
                <div className="container pl-20!">
                    {
                        type === 'admin' ? (
                            <>
                                <SectionHeading
                                    title="Admin Experience"
                                    subtitle="Manage your site effectively"
                                />
                            </>
                        ) : (
                            <>
                                <SectionHeading
                                    title="My Experience"
                                    subtitle="Full stack developer building scalable applications with modern technologies efficiently."
                                />
                            </>
                        )
                    }

                    <ul className="cmp-my-experience__list">
                        <li className="cmp-my-experience__item">
                            <h3 className="cmp-my-experience__company">Adobe Systems Private Limited</h3>
                            <p className="cmp-my-experience__duration">March 2026 - Present</p>
                            <p className="cmp-my-experience__location text-sm">Bengaluru, Karnataka</p>
                            <div className="cmp-my-experience__skill-list flex gap-3 my-4 flex-wrap">
                                {
                                    [0, 1, 2, 3].map((item) => (
                                        <Badge key={item}>Responsibility {item + 1}</Badge>
                                    ))
                                }
                            </div>
                            <div className="cmp-my-experience__role-container mb-3">
                                <h4 className="cmp-my-experience__role text-lg">Full Stack Developer</h4>
                                <p className="cmp-my-experience__duration">March 2026 - Present</p>
                                <p className="cmp-my-experience__description text-base">Owned end-to-end UI integration, designing and implementing user flows using HTML5, CSS3, JavaScript, jQuery, AJAX, and Handlebars. Worked extensively with Adobe Experience Manager (AEM) to build reusable templates and components for CMS-driven solutions. Led frontend development with a focus on performance, scalability, and bug resolution. Also leveraged Adobe Edge Delivery Services (EDS) and React Native for optimized web and cross-platform mobile experiences.</p>
                            </div>
                            <div className="cmp-my-experience__role-container mb-3">
                                <h4 className="cmp-my-experience__role text-lg">Full Stack Developer</h4>
                                <p className="cmp-my-experience__duration">March 2026 - Present</p>
                                <p className="cmp-my-experience__description text-base">Owned end-to-end UI integration, designing and implementing user flows using HTML5, CSS3, JavaScript, jQuery, AJAX, and Handlebars. Worked extensively with Adobe Experience Manager (AEM) to build reusable templates and components for CMS-driven solutions. Led frontend development with a focus on performance, scalability, and bug resolution. Also leveraged Adobe Edge Delivery Services (EDS) and React Native for optimized web and cross-platform mobile experiences.</p>
                            </div>
                        </li>
                        <li className="cmp-my-experience__item">
                            <h3 className="cmp-my-experience__company">Adobe Systems Private Limited</h3>
                            <p className="cmp-my-experience__duration">March 2026 - Present</p>
                            <p className="cmp-my-experience__location text-sm">Bengaluru, Karnataka</p>
                            <div className="cmp-my-experience__skill-list flex gap-3 my-4 flex-wrap">
                                {
                                    [0, 1, 2, 3].map((item) => (
                                        <Badge key={item}>Responsibility {item + 1}</Badge>
                                    ))
                                }
                            </div>
                            <div className="cmp-my-experience__role-container mb-3">
                                <h4 className="cmp-my-experience__role text-lg">Full Stack Developer</h4>
                                <p className="cmp-my-experience__duration">March 2026 - Present</p>
                                <p className="cmp-my-experience__description text-base">Owned end-to-end UI integration, designing and implementing user flows using HTML5, CSS3, JavaScript, jQuery, AJAX, and Handlebars. Worked extensively with Adobe Experience Manager (AEM) to build reusable templates and components for CMS-driven solutions. Led frontend development with a focus on performance, scalability, and bug resolution. Also leveraged Adobe Edge Delivery Services (EDS) and React Native for optimized web and cross-platform mobile experiences.</p>
                            </div>
                        </li>
                    </ul>
                </div>
            </section>
        </>
    )
}