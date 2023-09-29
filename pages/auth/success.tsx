import { isClient } from '@/lib/utils';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function AuthSuccess() {
    const [showSuccess, setShowSuccess] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setShowSuccess(true);
    }, []);

    if (!isClient) return;

    if (window.opener) {
        window.opener.postMessage({ type: 'signinResult', success: true }, window.location.origin);
        return window.close();
    }

    router.replace('/play');

    const success = <div style={{
        fontSize: '2rem',
        padding: '1rem',
    }}>
        <p>Successfully signed in</p>
        <p>You can now close this window.</p>
    </div>;
    if (showSuccess) return success;
}
