'use client';
import { useForm } from "react-hook-form";
import Input from "@/block/ui/input/Input";
import type { AuthType } from "@/@types/Auth.types";
import Button from "@/block/ui/button/Button";
import Card from "@/block/ui/card/Card";
import './login.css';
import {  useRouter } from "next/navigation";

const LoginComponent = () => {
    const { register, handleSubmit, formState: { errors } } = useForm<AuthType>();
    const router = useRouter();
    
    
    const onSubmit = async (data: AuthType) => {
        const response = await fetch('/api/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            // Handle error
            console.error('Login failed');
        } else {
            // Redirect to admin dashboard or another page
            router.push('/admin/dashboard');
        }
    };
    return (
        <div className="cmp-login">
            <Card>

                <Card.Heading>
                    Login
                </Card.Heading>
                
                <Card.Body>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Input register={register('email',
                        {
                            required: "Email is required",
                            pattern: {
                                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                message: "Invalid email address"
                            }
                        }
                    )} error={errors.email?.message} label="Email" placeholder="Enter your email" />
                    <Input register={register('password', {
                        required: "Password is required",
                        minLength: {
                            value: 8,
                            message: "Password must be at least 8 characters long"
                        },
                    })} error={errors.password?.message} label="Password" placeholder="Enter your password" type="password" />
                    <Button type="submit">Login</Button>
                </form>

            </Card.Body>
            </Card>
        </div>
    )
}

export default LoginComponent;
