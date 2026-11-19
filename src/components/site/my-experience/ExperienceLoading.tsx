import SectionHeading from "@/block/site/section-heading/section-heading";

const ExperienceLoading = ({ className = "" }: { className?: string }) => (
    <section id="Experience" role="status" aria-label="Loading experience" aria-busy="true" className={`cmp-my-experience ${className}`}>
        <div className="container pl-20!">
            <SectionHeading title="My Experience" />
            <ul aria-hidden="true" className="cmp-my-experience__list animate-pulse motion-reduce:animate-none">
                {Array.from({ length: 3 }, (_, index) => (
                    <li key={index} className="cmp-my-experience__item">
                        <div className="shimmer h-7 w-3/4 mb-2" />
                        <div className="shimmer h-4 w-40 mb-2" />
                        <div className="shimmer h-4 w-28 mb-4" />
                        <div className="flex gap-3 mb-4">
                            <div className="shimmer h-6 w-24" />
                            <div className="shimmer h-6 w-24" />
                        </div>
                        <div className="shimmer h-6 w-1/2 mb-2" />
                        <div className="shimmer h-4 w-full mb-2" />
                        <div className="shimmer h-4 w-2/3" />
                    </li>
                ))}
            </ul>
        </div>
    </section>
);

export default ExperienceLoading;
