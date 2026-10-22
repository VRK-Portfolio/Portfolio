import Badge from "@/block/ui/badge/Badge";
import Card from "@/block/ui/card/Card";
import { Award, MoveUpRight } from "lucide-react";
import './certification.css';
import SectionHeading from "@/block/site/section-heading/section-heading";
import Link from "next/link";
import {useCertifications, useDeleteCertifications} from "@/hooks/useCertifications";
import Button from "@/block/ui/button/Button";

const CertificationComponent = ({ className = '', modalOpen, type = 'site' }: { className?: string, modalOpen?: (id?: string) => void, type?: 'admin' | 'site' }) => {
    const { certifications } = useCertifications();
    const { deleteCertification } = useDeleteCertifications();
    return (
        <div className={`cmp-certification ${className} ${type === 'admin' ? 'cmp-admin__type' : ''}`}>
            <div className="container">
                {
                    type === 'site' && (
                        <>
                            <SectionHeading title="Certifications" subtitle="Sample Sub Heading for Certifications" />
                        </>
                    )
                }
                {
                    type === 'admin' && (
                        <>
                            <div className="cmp-admin__heading-actions">
                                <SectionHeading title='Admin View of Certifications' subtitle='Manage and oversee all certifications efficiently.' Tag={'h4'} />
                                <Button variant="primary" className='cmp-admin__add-certification w-40' onClick={() => modalOpen?.()}>Add Certification</Button>
                            </div>
                        </>
                    )
                }
                <div className="cmp-certification__content grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {
                        certifications?.map((certification) => (
                            <div className="cmp-certification__item" key={certification._id}>
                                <Card darkType="pure">
                                    <Card.Body>
                                        <div className="cmp-certification__icon">
                                            <Award />
                                        </div>
                                        <h3 className="cmp-certification__title">{certification.title}</h3>
                                        <p className="cmp-certification__issuer">Issuer : {certification.issuer}</p>
                                        <p className="cmp-certification__date">Issued: {certification.issueDate}</p>
                                        <p className="cmp-certification__credential-id">Credential ID: {certification.credentialID}</p>
                                        <div className="cmp-certification__skills inline-flex gap-2 flex-row flex-wrap">
                                            {certification.skillsCoverd.map((skill) => (
                                                <Badge key={skill}>{skill}</Badge>
                                            ))}
                                        </div>
                                    </Card.Body>
                                    <Card.Footer>
                                        <>
                                            <Link href={certification.credentialURL} className="inline-flex gap-3 items-center" target="_blank" rel="noopener noreferrer">
                                                <span>View Credential</span>
                                                <MoveUpRight size={16} />
                                            </Link>
                                            {type === 'admin' && (
                                                <>
                                                    <div className="flex gap-2 mt-2">
                                                        <Button variant="primary" outline className="w-1/2" onClick={() => modalOpen?.(certification._id)}>Edit</Button>
                                                        <Button variant="danger" outline className="w-1/2" onClick={() => deleteCertification(certification._id as string)}>Delete</Button>
                                                    </div>
                                                </>
                                            )
                                            }
                                        </>

                                    </Card.Footer>
                                </Card>
                            </div>
                        ))
                    }
                </div>
            </div>
        </div>
    );
};

export default CertificationComponent;
