'use client';
import { BasicInfoSchema, BasicInfoType } from "@/@types/BasicInfo.types";
import Button from "@/block/ui/button/Button";
import Card from "@/block/ui/card/Card";
import Input from "@/block/ui/input/Input";
import { useBasicInfo, useUpdateBasicInfo } from "@/hooks/useBasicInfo";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";

const BasicInfoComponent = () => {
    const { basicInfo } = useBasicInfo();
    const { updateBasicInfo } = useUpdateBasicInfo();
    const faviconUrl = basicInfo?.favicon_url || ""; 
    const avatarUrl = basicInfo?.avatar_url || ""; 
    const { handleSubmit, register, formState: { errors }, reset, control } = useForm<BasicInfoType>({
        defaultValues: {
            name: "",
            email: "",
            phone: "",
            address: "",
            about_me: "",
            bio: "",
            meta_description: "",
            avatar_url: "",
            favicon_url: "",
            github_url: "",
            linked_in_url: "",
            website_url: ""
        }
    });
    const metaDescription = useWatch({ control, name: "meta_description" }) ?? "";

    useEffect(() => {
        if (basicInfo) {
            reset({ ...basicInfo, meta_description: basicInfo.meta_description ?? "" });
        }
    }, [basicInfo, reset]);


    const onSubmit = (data: BasicInfoType) => {
        updateBasicInfo(data);
    };
    return (
        <div className="cmp-basic-info">
            <Card>
                <Card.Heading>Basic Information</Card.Heading>
                <Card.Body>
                    <form className="cmp-basic-info__form" onSubmit={handleSubmit(onSubmit)} >
                        <div className="grid grid-cols-2 gap-4">

                            <Input
                                label="Name"
                                type="text"
                                {...register("name", {
                                    required: "Name is required"
                                })}
                                error={errors.name?.message}
                            />
                            <Input
                                label="Email"
                                type="email"
                                {...register("email", {
                                    required: "Email is required",
                                    pattern: {
                                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                        message: "Invalid email address"
                                    }
                                })}
                                error={errors.email?.message}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Phone"
                                type="tel"
                                {...register("phone", {
                                    required: "Phone is required",
                                    minLength: {
                                        value: 10,
                                        message: "Phone must be at least 10 digits"
                                    },
                                    validate: (value) => /^\d+$/.test(value) || "Phone must be a number"
                                })}
                                error={errors.phone?.message}
                            />
                            <Input
                                label="Profile Picture"
                                accept=".svg,.png,.jpg,.jpeg,.webp" 
                                type="file"
                                {...register("avatar_url", {
                                    required: avatarUrl ? false : "Profile Picture is required"
                                })}
                                error={errors.avatar_url?.message}
                            />
                        </div>
                        <Input
                            label="Address"
                            type="text"
                            {...register("address", {
                                required: "Address is required"
                            })}
                            error={errors.address?.message}
                        />
                        <Input
                            label="About Me"
                            type="text"
                            {...register("about_me", {
                                required: "About Me is required"
                            })}
                            error={errors.about_me?.message}
                        />
                        <Input

                            label="Bio"
                            type="text"
                            {...register("bio", {
                                required: "Bio is required"
                            })}
                            error={errors.bio?.message}
                        />
                        <Input
                            label="SEO Description"
                            aria-label="SEO Description"
                            aria-describedby="seo-description-help"
                            type="text"
                            {...register("meta_description", {
                                validate: value => {
                                    const result = BasicInfoSchema.shape.meta_description.safeParse(value);
                                    return result.success || result.error.issues[0].message;
                                }
                            })}
                            error={errors.meta_description?.message}
                        />
                        <p id="seo-description-help" className="text-sm">
                            {metaDescription.trim().length}/220 characters. Use 150-220 characters for search and social previews.
                            Leave blank to use Bio. This does not change your visible introduction.
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <Input type="file"
                                accept=".svg,.png,.jpg,.jpeg,.webp" 
                                label="Favicon"
                                {...register("favicon_url", {
                                    required: faviconUrl ? false : "Favicon is required"
                                })}
                                error={errors.favicon_url?.message}
                            />
                            <Input type="text"
                                label="Website URL"
                                {...register("website_url", {
                                    required: "Website URL is required"
                                })}
                                error={errors.website_url?.message}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input type="text"
                                label="LinkedIn URL"
                                {...register("linked_in_url", {
                                    required: "LinkedIn URL is required"
                                })}
                                error={errors.linked_in_url?.message}
                            />
                            <Input type="text"
                                label="GitHub URL"
                                {...register("github_url", {
                                    required: "GitHub URL is required"
                                })}
                                error={errors.github_url?.message}
                            />
                        </div>
                        <Button type="submit">
                            Save
                        </Button>
                    </form>
                </Card.Body>
            </Card>
        </div>
    );
}

export default BasicInfoComponent;
