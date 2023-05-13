import { authErrors } from '@/lib/auth';
import { isClient } from '@/utils/next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function AuthError() {
    const router = useRouter();
    console.log(router);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        const errorCode = typeof router.query.error === 'string' ? router.query.error : null;
        if (!errorCode) return setMessage('Unknown error (this is bad)');
        if (window.opener) {
            window.opener.postMessage({ type: 'signinResult', error: errorCode }, window.location.origin);
            return window.close();
        }
        setMessage(`An internal error occured: ${authErrors[errorCode]}`);
    }, [router.query.error]);

    return <p>{message}</p>;
}
