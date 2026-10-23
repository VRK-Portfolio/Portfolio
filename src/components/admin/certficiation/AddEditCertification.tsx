import { CertificationType } from "@/@types/Certification.types";
import Badge from "@/block/ui/badge/Badge";
import Button from "@/block/ui/button/Button";
import Input from "@/block/ui/input/Input";
import { useAddCertification, useCertifications, useUpdateCertifications } from "@/hooks/useCertifications";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

interface AddEditCertificationProps {
    modalState: { isOpen: boolean; mode: 'add' | 'edit'; certificationId?: string | null };
    setModalState: React.Dispatch<React.SetStateAction<{ isOpen: boolean; mode: 'add' | 'edit'; certificationId?: string | null }>>;
}

type CertificationFormValues = Omit<CertificationType, 'issueDate' | 'expirationDate'> & {
    issueDate: string;
    expirationDate: string;
};

const AddEditCertification = ({ modalState, setModalState }: AddEditCertificationProps) => {
    const { mode, certificationId } = modalState;
    const { certifications } = useCertifications();
    const { addCertification } = useAddCertification();
    const { updateCertification } = useUpdateCertifications();
    const today = new Date().toISOString().slice(0, 10);
    const { register, handleSubmit, formState: { errors }, setValue, getValues, control, reset } = useForm<CertificationFormValues>({
        defaultValues: {
            title: '',
            issuer: '',
            issueDate: today,
            credentialID: '',
            credentialURL: '',
            expirationDate: today,
            skillsCoverd: []
        }
    });

    const [error, setError] = useState<{ message: string } | null>(null);
    const [skillsList, setSkillsList] = useState('');
    const currentCertification = certifications.find((cert) => cert._id === certificationId);

    const skillsCovered = useWatch({ control, name: 'skillsCoverd' }) || [];

    useEffect(() => {
        if (mode === 'edit' && certificationId) {
            if (currentCertification) {
                reset({
                    ...currentCertification,
                    issueDate: currentCertification.issueDate.toISOString().slice(0, 10),
                    expirationDate: currentCertification.expirationDate.toISOString().slice(0, 10),
                });
            }
        } else {
            reset({
                title: '',
                issuer: '',
                issueDate: today,
                credentialID: '',
                credentialURL: '',
                expirationDate: today,
                skillsCoverd: []
            });
        }
    }, [mode, certificationId, certifications, currentCertification, reset, today ]);

    useEffect(() => {
        register('skillsCoverd', {
            validate: (value) => (value && value.length > 0) || 'At least one capability is required',
        });
    }, [register]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const currentSkills = getValues('skillsCoverd') || [];
            const value = skillsList.trim();
            if (value && !currentSkills.includes(value)) {
                setValue('skillsCoverd', [...currentSkills, value], { shouldValidate: true });
                setSkillsList('');
            }
        }
    };

    const removeSkill = (indexToRemove: number) => {
        const currentSkills = getValues('skillsCoverd') || [];
        setValue(
            'skillsCoverd',
            currentSkills.filter((_, index) => index !== indexToRemove),
            { shouldValidate: true }
        );
    };

    const onSubmit = (values: CertificationFormValues) => {
        const data: CertificationType = {
            ...values,
            issueDate: new Date(values.issueDate),
            expirationDate: new Date(values.expirationDate),
        };
        console.log(data);
        if (mode === 'edit' && certificationId) {
            updateCertification(data, {
                onSuccess: () => {
                    reset();
                    setModalState({ isOpen: false, mode: 'add', certificationId: null });
                    setError(null);
                },
                onError: (err: Error) => {
                    setError({ message: err.message });
                },
            });
            setModalState({ isOpen: false, mode: 'add', certificationId: null });
        } else {
            addCertification(data, {
                onSuccess: () => {
                    reset();
                    setModalState({ isOpen: false, mode: 'add', certificationId: null });
                    setError(null);
                },
                onError: (err: Error) => {
                    setError({ message: err.message });
                }
            });
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            {error?.message && <p className="form-error text-red-500 mb-2">{error.message}</p>}
            
            <Input 
                {...register('title', { required: 'Certification Name is required' })} 
                placeholder="Certification Name" 
                error={errors.title?.message} 
                label="Certification Name" 
            />
            <Input 
                {...register('issuer', { required: 'Issuer is required' })} 
                placeholder="Issuer" 
                error={errors.issuer?.message} 
                label="Issuer" 
            />
            <Input 
                {...register('credentialID', { required: 'Category is required' })} 
                placeholder="Credential ID" 
                error={errors.credentialID?.message} 
                label="Credential ID" 
            />

            <Input
                type="date"
                {...register('issueDate', { required: 'Issue Date is required' })} 
                placeholder="Issue Date" 
                error={errors.issueDate?.message} 
                label="Issue Date" 
            />

                        <Input
                type="date"
                {...register('expirationDate', { required: 'Expiry Date is required' })} 
                placeholder="Expiry Date" 
                error={errors.expirationDate?.message} 
                label="Expiry Date" 
            />
            {/* Skills Input */}
            <div className="space-y-1">
                <Input
                    label="Skills"
                    type="text"
                    value={skillsList}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSkillsList(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type and press Enter to add Skills..."
                    error={errors.skillsCoverd?.message}
                />
            </div>
                
            <div className="flex flex-wrap gap-2 mt-2 mb-2">
                {skillsCovered.map((skills, index) => (
                    <Badge 
                        key={index}
                        close={true}
                        onClose={() => removeSkill(index)}
                    >
                        {skills}
                    </Badge>
                ))}
            </div>

            <Input 
                type="url"
                {...register('credentialURL', { 
                    required: 'Credential URL is required'
                })} 
                placeholder="Credential URL" 
                error={errors.credentialURL?.message} 
                label={mode === 'edit' ? 'Update Credential URL (Optional)' : 'Credential URL'} 
            />

            <div className="flex gap-4 mt-4">
                <Button 
                    type="button" 
                    outline 
                    variant="secondary" 
                    onClick={() => setModalState({ isOpen: false, mode: 'add', certificationId: null })}
                >
                    Cancel
                </Button>
                <Button type="submit">
                    {mode === 'edit' ? 'Update Certification' : 'Submit'}
                </Button>
            </div>
        </form>
    );
};

export default AddEditCertification;