import { AuthErrors } from '@/lib/constants';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import styles from './Login.module.css';
import cn from 'classnames';
import Image from 'next/image';

type ResultMessage = ({
    type: 'signinResult'
    error?: string;
    internalError?: string;
    success?: boolean;
}) | { type: null } | null;

export function LoginButton() {
    const [pending, setPending] = useState(false);
    const session = useSession();

    useEffect(() => {
        if (session.status === 'authenticated' && pending)
            setPending(false);
    }, [session.status, pending]);

    const listener = ({ data }: { data: ResultMessage }) => {
        console.log(data);
        if (data?.type !== 'signinResult') return;
        setPending(false);

        if (data.success) {
        };

        // TODO - show errors to user
        if (data.error) return console.error(`${AuthErrors[data.error]}`);
        if (data.internalError) return console.error(`An internal error occured: ${data.internalError}`);
    };
    useEffect(() => {
        window.addEventListener('message', listener);
        return () => window.removeEventListener('message', listener);
    }, []);
    const login = () => {
        if (pending) return;
        window.open('/popout/signin', 'Sign in with Discord', 'width=500,height=800');
        setPending(true);
    };

    const buttonInner = session.status === 'authenticated'
        ? <>
            <Image className={styles.avatar} src={session.data.user!.image!} width={16} height={16} alt="User avatar"/>
            <span className={styles.username}>{session.data!.user!.name}</span>
        </>
        : <span>Sign in</span>;
    const onClick = session.status === 'authenticated' ? undefined : login;

    return <div role="button" onClick={onClick} className={cn({
        [styles.loginButton]: true,
        [styles.loggedIn]: session.status === 'authenticated',
        [styles.pending]: pending,
    })}>{buttonInner}</div>;
}
