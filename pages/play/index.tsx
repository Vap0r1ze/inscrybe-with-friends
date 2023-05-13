import { useSession } from 'next-auth/react';

export default function Play() {
    const session = useSession();

    return (
        <main>
            <pre>{JSON.stringify(session, null, 2)}</pre>
        </main>
    );
}
