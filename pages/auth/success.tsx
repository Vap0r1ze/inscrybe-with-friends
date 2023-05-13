import { isClient } from '@/utils/next';
import { useState } from 'react';

export default function AuthError() {
    const [showSuccess, setShowSuccess] = useState(false);

    if (!isClient) return;

    if (window.opener) {
        window.opener.postMessage({ type: 'signinResult', success: true }, window.location.origin);
        return window.close();
    }

    setShowSuccess(true);

    const success = <div>
        <p>Successfully signed in</p>
        <p>You can now close this window.</p>
    </div>;
    if (showSuccess) return success;
}
