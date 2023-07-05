import styles from './SignIn.module.css';
import { AuthErrors } from '@/lib/constants';
import { signOut, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import classNames from 'classnames';
import Image from 'next/image';
import { Text } from '../ui/Text';
import { Button } from './Button';

type ResultMessage = ({
    type: 'signinResult'
    error?: string;
    internalError?: string;
    success?: boolean;
}) | { type: null } | null;

export function SignInButton() {
    const [pending, setPending] = useState(false);
    const session = useSession();
    const isSignedIn = session.status === 'authenticated';

    useEffect(() => {
        if (isSignedIn && pending) setPending(false);
    }, [isSignedIn, pending]);

    useEffect(() => {
        const listener = ({ data }: { data: ResultMessage }) => {
            if (data?.type !== 'signinResult') return;
            console.debug('Sign in result: %o', data);
            setPending(false);

            if (data.success) {
            };

            // TODO - show errors to user
            if (data.error) return console.error(`${AuthErrors[data.error]}`);
            if (data.internalError) return console.error(`An internal error occured: ${data.internalError}`);
        };
        window.addEventListener('message', listener);
        return () => window.removeEventListener('message', listener);
    }, []);

    const onSignIn = () => {
        if (pending) return;
        window.open('/auth/signin', 'Sign in with Discord', 'width=500,height=800');
        setPending(true);
    };
    const onSignOut = () => {
        if (pending) return;
        signOut();
    };

    return <Button
        className={classNames(styles.button, {
            [styles.pending]: pending,
        })}
        border="--discord-dark"
        onClick={isSignedIn ? onSignOut : onSignIn}
    >
        {isSignedIn
            ? <>
                <Image className={styles.avatar} src={session.data.user!.image!} width={16} height={16} alt="User avatar"/>
                <Text className={styles.username}>{session.data!.user!.name}</Text>
            </>
            : <Text>{' Sign in '}</Text>}
    </Button>;
}
