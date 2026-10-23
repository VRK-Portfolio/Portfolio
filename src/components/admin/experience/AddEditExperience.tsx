import type { ExperienceType, PositionType } from "@/@types/Experience.types";
import Badge from "@/block/ui/badge/Badge";
import Button from "@/block/ui/button/Button";
import Input from "@/block/ui/input/Input";
import { useCreateExperience, useGetExpericence, useUpdateExperience } from "@/hooks/useExperience";
import { useEffect, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

interface AddEditExperienceProps {
    modalState: { isOpen: boolean; mode: 'add' | 'edit'; experienceId?: string | null };
    setModalState: React.Dispatch<React.SetStateAction<{ isOpen: boolean; mode: 'add' | 'edit'; experienceId?: string | null }>>;
}

type PositionFormValues = Omit<PositionType, 'startDate' | 'endDate'> & {
    startDate: string;
    endDate: string;
};

type ExperienceFormValues = Omit<ExperienceType, 'positions'> & {
    positions: PositionFormValues[];
};

const emptyPosition: PositionFormValues = {
    role: '',
    startDate: '',
    endDate: '',
    isCurrentPosition: false,
    description: '',
};

const AddEditExperience = ({ modalState, setModalState }: AddEditExperienceProps) => {
    const { mode, experienceId } = modalState;
    const { experienceList, isLoading, isError, error: loadError } = useGetExpericence();
    const { addExperience, isLoading: isAdding } = useCreateExperience();
    const { updateExperience, isLoading: isUpdating } = useUpdateExperience();
    const currentExperience = experienceList.find((experience) => experience._id === experienceId);
    const [responsibility, setResponsibility] = useState('');
    const [error, setError] = useState<string | null>(null);
    const { register, handleSubmit, reset, control, getValues, setValue, formState: { errors } } = useForm<ExperienceFormValues>({
        defaultValues: {
            company: '',
            location: '',
            responsibilites: [],
            positions: [{ ...emptyPosition }],
        },
    });
    const { fields, append, remove } = useFieldArray({ control, name: 'positions' });
    const positions = useWatch({ control, name: 'positions' });
    const responsibilities = useWatch({ control, name: 'responsibilites' });
    const isSaving = isAdding || isUpdating;

    useEffect(() => {
        if (mode === 'edit') {
            if (currentExperience) {
                reset({
                    ...currentExperience,
                    positions: currentExperience.positions.map((position) => ({
                        ...position,
                        startDate: new Date(position.startDate).toISOString().slice(0, 10),
                        endDate: position.endDate && !position.isCurrentPosition
                            ? new Date(position.endDate).toISOString().slice(0, 10)
                            : '',
                    })),
                });
            }
        } else {
            reset({
                company: '',
                location: '',
                responsibilites: [],
                positions: [{ ...emptyPosition }],
            });
        }
    }, [mode, experienceId, currentExperience, reset]);

    useEffect(() => {
        register('responsibilites', {
            validate: (value) => value.length > 0 || 'At least one responsibility is required',
        });
    }, [register]);

    const addResponsibility = () => {
        const value = responsibility.trim();
        if (value && !getValues('responsibilites').includes(value)) {
            setValue('responsibilites', [...getValues('responsibilites'), value], { shouldValidate: true });
            setResponsibility('');
        }
    };

    const closeModal = () => setModalState({ isOpen: false, mode: 'add', experienceId: null });

    const onSubmit = (values: ExperienceFormValues) => {
        setError(null);
        const data: ExperienceType = {
            ...values,
            positions: values.positions.map((position) => ({
                ...position,
                startDate: new Date(position.startDate),
                endDate: !position.isCurrentPosition && position.endDate ? new Date(position.endDate) : undefined,
            })),
        };
        const callbacks = {
            onSuccess: closeModal,
            onError: (err: Error) => setError(err.message),
        };
        if (mode === 'edit') {
            updateExperience(data, callbacks);
        } else {
            addExperience(data, callbacks);
        }
    };

    if (mode === 'edit') {
        if (isLoading) {
            return <p role="status">Loading experience...</p>;
        }
        if (isError) {
            return <p role="alert">{loadError?.message || 'Failed to load experience'}</p>;
        }
        if (!currentExperience) {
            return <p role="alert">Experience not found.</p>;
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {error && <p role="alert" className="form-error text-red-500 mb-2">{error}</p>}
            <fieldset disabled={isSaving}>
                <Input
                    aria-label="Company"
                    label="Company"
                    placeholder="Company"
                    {...register('company', { validate: (value) => !!value.trim() || 'Company is required' })}
                    error={errors.company?.message}
                />
                <Input
                    aria-label="Location"
                    label="Location"
                    placeholder="Location"
                    {...register('location', { validate: (value) => !!value.trim() || 'Location is required' })}
                    error={errors.location?.message}
                />
                <Input
                    aria-label="Responsibility"
                    label="Responsibilities"
                    placeholder="Type and press Enter to add a responsibility..."
                    value={responsibility}
                    onChange={(event) => setResponsibility(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            addResponsibility();
                        }
                    }}
                    error={errors.responsibilites?.message}
                />
                <Button outline onClick={addResponsibility}>Add Responsibility</Button>
                <div className="flex flex-wrap gap-2 my-4">
                    {responsibilities.map((value, index) => (
                        <Badge key={value} close onClose={() => setValue(
                            'responsibilites',
                            getValues('responsibilites').filter((_, itemIndex) => itemIndex !== index),
                            { shouldValidate: true }
                        )}>
                            {value}
                        </Badge>
                    ))}
                </div>
                {fields.map((field, index) => (
                    <fieldset key={field.id} className="border border-gray-300 rounded-sm p-4 mb-4">
                        <legend className="px-2 font-semibold">Position {index + 1}</legend>
                        <Input
                            aria-label={`Role ${index + 1}`}
                            label="Role"
                            {...register(`positions.${index}.role`, {
                                validate: (value) => !!value.trim() || 'Role is required',
                            })}
                            error={errors.positions?.[index]?.role?.message}
                        />
                        <Input
                            aria-label={`Start Date ${index + 1}`}
                            label="Start Date"
                            type="date"
                            {...register(`positions.${index}.startDate`, {
                                required: 'Start date is required',
                                onChange: () => {
                                    if (getValues(`positions.${index}.endDate`)) {
                                        setValue(`positions.${index}.endDate`, getValues(`positions.${index}.endDate`), { shouldValidate: true });
                                    }
                                },
                            })}
                            error={errors.positions?.[index]?.startDate?.message}
                        />
                        <label className="flex items-center gap-2 mb-4">
                            <input type="checkbox" {...register(`positions.${index}.isCurrentPosition`, {
                                onChange: (event) => {
                                    if (event.target.checked) {
                                        setValue(`positions.${index}.endDate`, '', { shouldValidate: true });
                                    }
                                },
                            })} />
                            Current position {index + 1}
                        </label>
                        {!positions[index]?.isCurrentPosition && (
                            <Input
                                aria-label={`End Date ${index + 1}`}
                                label="End Date (Optional)"
                                type="date"
                                {...register(`positions.${index}.endDate`, {
                                    validate: (value) => !value || !getValues(`positions.${index}.startDate`)
                                        || value >= getValues(`positions.${index}.startDate`)
                                        || 'End date must be on or after the start date',
                                })}
                                error={errors.positions?.[index]?.endDate?.message}
                            />
                        )}
                        <div className={`cmp-input ${errors.positions?.[index]?.description ? 'cmp-input--error' : ''}`}>
                            <label className="cmp-input__label" htmlFor={`position-description-${field.id}`}>Description</label>
                            <textarea
                                id={`position-description-${field.id}`}
                                aria-label={`Description ${index + 1}`}
                                className="cmp-input__field"
                                rows={4}
                                {...register(`positions.${index}.description`, {
                                    validate: (value) => !!value.trim() || 'Description is required',
                                })}
                            />
                            {errors.positions?.[index]?.description && (
                                <p className="cmp-input__error">{errors.positions[index]?.description?.message}</p>
                            )}
                        </div>
                        <Button variant="danger" outline disabled={fields.length === 1} onClick={() => remove(index)}>
                            Remove Position {index + 1}
                        </Button>
                    </fieldset>
                ))}
                <Button outline onClick={() => append({ ...emptyPosition })}>Add Position</Button>
                <div className="flex gap-4 mt-4">
                    <Button variant="secondary" outline onClick={closeModal}>Cancel</Button>
                    <Button type="submit">
                        {isSaving ? 'Saving...' : mode === 'edit' ? 'Update Experience' : 'Add Experience'}
                    </Button>
                </div>
            </fieldset>
        </form>
    );
}

export default AddEditExperience;