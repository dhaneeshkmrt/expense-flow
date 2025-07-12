'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/lib/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/logo';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
    const { signUpWithEmail, loading } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<SignupFormValues>({
        resolver: zodResolver(signupSchema),
        defaultValues: { name: '', email: '', password: '' },
    });

    const onSubmit = async (data: SignupFormValues) => {
        setIsSubmitting(true);
        try {
            await signUpWithEmail(data.email, data.password, data.name);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Sign Up Failed',
                description: error.message || 'An unexpected error occurred.',
            });
            setIsSubmitting(false);
        }
    };
    
    const isLoading = loading || isSubmitting;

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <div className="mb-4 inline-block">
                        <Logo />
                    </div>
                    <CardTitle className="text-2xl">Create an Account</CardTitle>
                    <CardDescription>Enter your details to get started.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                             <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="John Doe" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input type="email" placeholder="name@example.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="••••••••" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Account
                            </Button>
                        </form>
                    </Form>
                </CardContent>
                <CardFooter className="flex justify-center text-sm">
                     <p className="text-muted-foreground">
                        Already have an account?&nbsp;
                        <Link href="/login" className="font-medium text-primary hover:underline">
                            Sign In
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
