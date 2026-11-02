import { BlogsTypeSchema, BlogWriteSchema, BlogWriteType } from "@/@types/Blogs.types";
import Button from "@/block/ui/button/Button";
import Input from "@/block/ui/input/Input";
import RichTextEditor from "@/block/ui/rich-text-editor/RichTextEditor";
import { useBlogListing, useCreateBlog, useUpdateBlog } from "@/hooks/useBlogListing";
import { useSkills } from "@/hooks/useSkills";
import { imageMimeTypes, uploadImageFile } from "@/libs/upload-image";
import Image from "next/image";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

export interface BlogModalState {
    isOpen: boolean;
    mode: 'add' | 'edit';
    blogId?: string | null;
}

interface AddEditBlogsProps {
    modalState: BlogModalState;
    setModalState: React.Dispatch<React.SetStateAction<BlogModalState>>;
}

const BlogForm = ({ modalState, setModalState, initialValues }: AddEditBlogsProps & { initialValues: BlogWriteType }) => {
    const { createBlog, isCreating } = useCreateBlog();
    const { updateBlog, isUpdating } = useUpdateBlog();
    const { skills, isSkillsLoading, isSkillsError, skillsError } = useSkills();
    const [isUploading, setUploading] = useState(false);
    const [isCoverUploading, setCoverUploading] = useState(false);
    const [coverError, setCoverError] = useState('');
    const hasPendingUpload = isUploading || isCoverUploading;
    const isSaving = isCreating || isUpdating;
    const { register, control, handleSubmit, getValues, setValue, setError, formState: { errors } } = useForm<BlogWriteType>({
        defaultValues: initialValues,
        resolver: values => {
            const result = BlogWriteSchema.safeParse(values);
            return result.success ? { values: result.data, errors: {} } : {
                values: {},
                errors: Object.fromEntries(result.error.issues.map(issue => [
                    issue.path[0], { type: 'validate', message: issue.message },
                ])),
            };
        },
    });
    const coverImage = useWatch({ control, name: 'coverImage' });
    const close = () => setModalState({ isOpen: false, mode: 'add', blogId: null });
    const uploadCover = async (file: File) => {
        setCoverError('');
        setCoverUploading(true);
        try {
            const url = await uploadImageFile(file);
            setValue('coverImage', url, { shouldDirty: true, shouldValidate: true });
        } catch (error) {
            setCoverError(error instanceof Error ? error.message : 'Cover image upload failed. Please try again.');
        } finally {
            setCoverUploading(false);
        }
    };
    const submit = (values: BlogWriteType) => {
        if (isSaving || hasPendingUpload) {
            setError('root', { message: 'Please wait for the current save or image upload to finish.' });
            return;
        }
        if (coverError) {
            setError('root', { message: 'Retry or discard the failed cover upload before saving.' });
            return;
        }
        const callbacks = {
            onSuccess: close,
            onError: (error: Error) => setError('root', { message: error.message }),
        };
        if (modalState.mode === 'edit' && modalState.blogId) {
            updateBlog({ ...values, _id: modalState.blogId }, callbacks);
        } else {
            createBlog(values, callbacks);
        }
    };

    return (
        <form onSubmit={handleSubmit(submit)} noValidate>
            {errors.root?.message && <p role="alert" className="mb-2 text-red-500">{errors.root.message}</p>}
            <fieldset disabled={isSaving}>
                <Input label="Title" aria-label="Title" placeholder="Blog Title" error={errors.title?.message} {...register('title', {
                    onBlur: event => {
                        if (!getValues('slug').trim()) {
                            setValue('slug', event.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
                        }
                    },
                })} />
                <Input label="Slug" aria-label="Slug" placeholder="blog-url-slug" error={errors.slug?.message} {...register('slug')} />
                <Input label="Category" aria-label="Category" placeholder="Blog Category" error={errors.category?.message} {...register('category')} />
                <Input label="Author" aria-label="Author" error={errors.author?.message} {...register('author')} />
                <input type="hidden" {...register('coverImage')} />
                <Input
                    label="Cover image"
                    aria-label="Cover image"
                    type="file"
                    accept={imageMimeTypes.join(',')}
                    disabled={isCoverUploading}
                    error={errors.coverImage?.message}
                    onChange={event => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        if (file) void uploadCover(file);
                    }}
                />
                {isCoverUploading && <p role="status" className="mb-2">Uploading cover image...</p>}
                {coverError && (
                    <div className="mb-4">
                        <p role="alert" className="mb-2 text-red-500">{coverError}</p>
                        <Button outline onClick={() => setCoverError('')}>Discard failed upload</Button>
                    </div>
                )}
                {coverImage && (
                    <div className="mb-4">
                        <Image src={coverImage} alt="Blog cover preview" width={320} height={180} unoptimized className="mb-2 max-h-40 w-auto rounded object-contain" />
                        <Button outline disabled={isCoverUploading} onClick={() => {
                            setValue('coverImage', '', { shouldDirty: true, shouldValidate: true });
                            setCoverError('');
                        }}>Remove cover image</Button>
                    </div>
                )}
                <label className="mb-4 grid gap-2">
                    Status
                    <select className="rounded border border-gray-300 p-2 dark:bg-gray-900" {...register('status')}>
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                    </select>
                </label>
                <fieldset className="mb-4">
                    <legend className="mb-2 font-medium">Skills (optional)</legend>
                    {isSkillsLoading && <p role="status">Loading skills...</p>}
                    {isSkillsError && <p role="alert">{skillsError?.message || 'Failed to load skills'}</p>}
                    <div className="flex flex-wrap gap-3">
                        {skills.map(skill => skill._id && (
                            <label key={skill._id} className="inline-flex items-center gap-2">
                                <input type="checkbox" value={skill._id} {...register('skills')} />
                                {skill.name}
                            </label>
                        ))}
                    </div>
                    {errors.skills?.message && <p role="alert">{errors.skills.message}</p>}
                </fieldset>
                <Controller name="content" control={control} render={({ field }) => (
                    <RichTextEditor
                        label="Blog content"
                        initialContent={initialValues.content}
                        onChange={field.onChange}
                        disabled={isSaving}
                        onUploadingChange={setUploading}
                    />
                )} />
                {errors.content?.message && <p role="alert" className="mb-2 text-red-500">{errors.content.message}</p>}
                <div className="flex gap-2">
                    <Button type="submit" disabled={isSaving || hasPendingUpload || !!coverError}>
                        {isSaving ? 'Saving...' : modalState.mode === 'edit' ? 'Update Blog' : 'Add Blog'}
                    </Button>
                    <Button outline onClick={close} disabled={isSaving || hasPendingUpload}>Cancel</Button>
                </div>
            </fieldset>
        </form>
    );
};

const AddEditBlogs = ({ modalState, setModalState }: AddEditBlogsProps) => {
    const { blogs, isLoading, isError, error } = useBlogListing();
    if (!modalState.isOpen) return null;
    const current = blogs?.find(blog => blog._id === modalState.blogId);
    if (modalState.mode === 'edit') {
        if (isLoading) return <p role="status">Loading blog...</p>;
        if (isError) return <p role="alert">{error?.message || 'Failed to load blog'}</p>;
        if (!current) return <p role="alert">Blog not found.</p>;
    }
    return <BlogForm
        key={`${modalState.mode}-${modalState.blogId ?? 'new'}`}
        modalState={modalState}
        setModalState={setModalState}
        initialValues={{
            title: current?.title ?? '',
            slug: current?.slug ?? '',
            category: current?.category ?? '',
            content: current?.content ?? '',
            status: current?.status ?? 'draft',
            author: current?.author ?? BlogsTypeSchema.shape.author.parse(undefined),
            coverImage: current?.coverImage ?? '',
            skills: current?.skills?.map(skill => skill._id) ?? [],
        }}
    />;
};

export default AddEditBlogs;
