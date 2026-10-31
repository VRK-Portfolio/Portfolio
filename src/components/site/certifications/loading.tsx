import Card from "@/block/ui/card/Card";
import SectionHeading from "@/block/site/section-heading/section-heading";

const CertificationLoading = ({ type = 'site' }: { type?: 'admin' | 'site' }) => {
    return (
        <>
            <div className={`cmp-certification cmp-my-skills ${type === 'admin' ? 'cmp-admin__type' : ''}`}>
                <div className="container">
                    <SectionHeading title="Certifications" subtitle="Sample Sub Heading for Certifications" />
                    <div className="cmp-certification__content grid md:grid-cols-2 xl:grid-cols-3 gap-4 animate-pulse">
                        {new Array(6).fill(null).map((_, key) => (
                            <div className="cmp-certification__item" key={key}>
                                <Card darkType="pure">
                                    <Card.Body>
                                        <div className="cmp-certification__icon shimmer">
                                        </div>
                                        <h3 className="cmp-certification__title shimmer w-[80%] h-6 mb-1"></h3>
                                        <p className="cmp-certification__issuer shimmer w-20 h-6 mb-1"></p>
                                        <p className="cmp-certification__date shimmer w-25 h-6 mb-1"></p>
                                        <p className="cmp-certification__credential-id shimmer w-20 h-6 mb-1"></p>
                                        <div className="cmp-certification__skills inline-flex gap-2 flex-row flex-wrap">
                                            {
                                                new Array(3).fill(null).map((_, skillKey) => (
                                                    <div key={skillKey} className="shimmer w-20 h-6 mb-1"></div>
                                                ))
                                            }
                                        </div>
                                    </Card.Body>
                                    <Card.Footer>
                                        <>
                                            <div className="inline-flex gap-3 items-center">
                                                <div className="shimmer w-20 h-6 mb-1"></div>
                                            </div>
                                        </>

                                    </Card.Footer>
                                </Card>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}

export default CertificationLoading;