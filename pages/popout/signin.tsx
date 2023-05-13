import { isClient } from '@/utils/next';
import { signIn } from 'next-auth/react';

export default function SignIn() {
    if (!isClient) return null;

    signIn('discord', { callbackUrl: '/auth/success' });
}
