import { isClient } from '@/lib/utils';
import { useEffect, useState } from 'react';

export default function AuthError() {
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        setShowSuccess(true);
    }, []);

    if (!isClient) return;

    if (window.opener) {
        window.opener.postMessage({ type: 'signinResult', success: true }, window.location.origin);
        return window.close();
    }

    const success = <div style={{
        fontSize: '2rem',
        padding: '1rem',
    }}>
        <p>Successfully signed in</p>
        <p>You can now close this window.</p>
    </div>;
    if (showSuccess) return success;
}
