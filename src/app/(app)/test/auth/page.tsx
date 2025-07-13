'use client';

import { useForm } from 'react-hook-form';
import { useApp } from '@/lib/provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AuthTestPage() {
  const { user, signInWithEmail } = useApp();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      email: 'test@example.com',
      password: 'password',
    },
  });

  const onSubmit = async (data: any) => {
    await signInWithEmail(data.email, data.password);
  };

  if (user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authentication Success</CardTitle>
          <CardDescription>You are logged in.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Welcome, {user.email}!</p>
          <pre className="p-4 bg-muted rounded-md overflow-x-auto text-sm">
            {JSON.stringify(user, null, 2)}
          </pre>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Test Sign In</CardTitle>
        <CardDescription>
          Sign in with a test email and password. A user will be created if one does not exist.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...register('password')} />
          </div>
          <Button type="submit" className="w-full">
            Sign In
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
