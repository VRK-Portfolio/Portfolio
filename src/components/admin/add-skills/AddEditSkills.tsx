import { MySkillsType } from "@/@types/MySkills.types";
import Badge from "@/block/ui/badge/Badge";
import Button from "@/block/ui/button/Button";
import Input from "@/block/ui/input/Input";
import { useCreateSkill, useSkills, useUpdateSkill } from "@/hooks/useSkills";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

interface AddEditSkillsProps {
    modalState: { isOpen: boolean; mode: 'add' | 'edit'; skillId?: string | null };
    setModalState: React.Dispatch<React.SetStateAction<{ isOpen: boolean; mode: 'add' | 'edit'; skillId?: string | null }>>;
}

const AddEditSkills = ({ modalState, setModalState }: AddEditSkillsProps) => {
    const { mode, skillId } = modalState;
    const { skills } = useSkills();
    const { createSkill } = useCreateSkill();
    const { updateSkill } = useUpdateSkill();
    const { register, handleSubmit, formState: { errors }, setValue, getValues, control, reset } = useForm<MySkillsType>({
        defaultValues: {
            name: '',
            proficiency: '',
            category: '',
            capabilities: [],
            icon: undefined,
        }
    });

    const [error, setError] = useState<{ message: string } | null>(null);
    const [capabilityList, setCapabilityList] = useState('');
    const currentSkill = skills.find((skill) => skill._id === skillId);
    const existingIconUrl = currentSkill?.icon as string | '';

    const capabilities = useWatch({ control, name: 'capabilities' }) || [];

    // Pre-populate form and capture existing icon URL in 'edit' mode
    useEffect(() => {
        if (mode === 'edit' && skillId) {
            if (currentSkill) {
                reset(currentSkill);
            }
        } else {
            reset({
                name: '',
                proficiency: '',
                category: '',
                capabilities: [],
                icon: undefined,
            });
        }
    }, [mode, skillId, skills, currentSkill, reset]);

    useEffect(() => {
        register('capabilities', {
            validate: (value) => (value && value.length > 0) || 'At least one capability is required',
        });
    }, [register]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const currentCapabilities = getValues('capabilities') || [];
            const value = capabilityList.trim();
            if (value && !currentCapabilities.includes(value)) {
                setValue('capabilities', [...currentCapabilities, value], { shouldValidate: true });
                setCapabilityList('');
            }
        }
    };

    const removeCapability = (indexToRemove: number) => {
        const currentCapabilities = getValues('capabilities') || [];
        setValue(
            'capabilities',
            currentCapabilities.filter((_, index) => index !== indexToRemove),
            { shouldValidate: true }
        );
    };

    const onSubmit = (data: MySkillsType) => {
        // If editing and no new file was selected, fallback to the existing icon URL string
        const finalData = {
            ...data,
            icon: data.icon && (data.icon as string).length > 0 ? data.icon : existingIconUrl,
        };

        if (mode === 'edit' && skillId) {
            console.log('Updating skill with payload:', skillId, finalData);
            updateSkill(finalData, {
                onSuccess: () => {
                    reset();
                    setModalState({ isOpen: false, mode: 'add', skillId: null });
                    setError(null);
                },
                onError: (err) => {
                    setError({ message: err.message });
                },
            });
            setModalState({ isOpen: false, mode: 'add', skillId: null });
        } else {
            createSkill(finalData, {
                onSuccess: () => {
                    reset();
                    setModalState({ isOpen: false, mode: 'add', skillId: null });
                    setError(null);
                },
                onError: (err) => {
                    setError({ message: err.message });
                }
            });
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            {error?.message && <p className="form-error text-red-500 mb-2">{error.message}</p>}
            
            <Input 
                {...register('name', { required: 'Skill Name is required' })} 
                placeholder="Name" 
                error={errors.name?.message} 
                label="Skill Name" 
            />
            <Input 
                {...register('proficiency', { required: 'Level is required' })} 
                placeholder="Level" 
                error={errors.proficiency?.message} 
                label="Level" 
            />
            <Input 
                {...register('category', { required: 'Category is required' })} 
                placeholder="Category" 
                error={errors.category?.message} 
                label="Category" 
            />

            {/* Capabilities Input */}
            <div className="space-y-1">
                <Input
                    label="Capabilities"
                    type="text"
                    value={capabilityList}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCapabilityList(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type and press Enter to add capability..."
                    error={errors.capabilities?.message}
                />
            </div>
                
            <div className="flex flex-wrap gap-2 mt-2 mb-2">
                {capabilities.map((capability, index) => (
                    <Badge 
                        key={index}
                        close={true}
                        onClose={() => removeCapability(index)}
                    >
                        {capability}
                    </Badge>
                ))}
            </div>

            <Input 
                type="file"
                accept=".svg,.png,.jpg,.jpeg,.webp" 
                {...register('icon', { 
                    required: mode === 'add' && !existingIconUrl ? 'Icon is required' : false 
                })} 
                placeholder="Icon" 
                error={errors.icon?.message} 
                label={mode === 'edit' ? 'Update Icon (Optional)' : 'Skill Icon / Skill Image'} 
            />

            <div className="flex gap-4 mt-4">
                <Button 
                    type="button" 
                    outline 
                    variant="secondary" 
                    onClick={() => setModalState({ isOpen: false, mode: 'add', skillId: null })}
                >
                    Cancel
                </Button>
                <Button type="submit">
                    {mode === 'edit' ? 'Update Skill' : 'Submit'}
                </Button>
            </div>
        </form>
    );
};

export default AddEditSkills;