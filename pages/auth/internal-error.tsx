import { isClient } from '@/lib/utils';
import { useRouter } from 'next/router';

export default function AuthError() {
    const router = useRouter();
    const errorCode = typeof router.query.error === 'string' ? router.query.error : null;

    if (!isClient) return null;

    if (window.opener) {
        window.opener.postMessage({ type: 'signinResult', internalError: errorCode }, window.location.origin);
        window.close();
    }

    return <p>An internal error occured: {errorCode || 'Unknown error (this is bad)'}</p>;
}
