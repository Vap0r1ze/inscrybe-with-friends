import styles from './Breadcrumbs.module.css';
import { ReactNode } from 'react';
import { Text } from '../ui/Text';
import { intersperseFn } from '@/lib/utils';
import { useRouter } from 'next/router';
import classNames from 'classnames';

type Part = {
    name: string;
    params?: number;
    parts?: Partial<Record<string, Part>>;
};
const rootParts: Partial<Record<string, Part>> = {
    play: {
        name: 'Play',
        parts: {
            playtest: {
                name: 'Playtest',
            },
            lobby: {
                name: 'Lobby',
                params: 1,
                parts: {
                    game: {
                        name: 'Game',
                    },
                },
            },
            'edit-decks': {
                name: 'Edit Decks',
            },
        },
    },
};

function parsePathname(pathname: string) {
    const paths: (Part & { href: string })[] = [];
    const parts = pathname.slice(1).split('/');

    let currentParts = rootParts;
    let href = '';
    for (let i = 0; i < parts.length; i++) {
        const path = currentParts[parts[i]];
        if (!path) return [];

        href += '/' + parts[i];
        if (path.params) {
            i += path.params;
            href += '/' + parts[i];
        };

        paths.push({ ...path, href });
        currentParts = path.parts ?? {};
    }

    return paths;
}

export function Breadcrumbs() {
    const router = useRouter();
    const paths = parsePathname(router.asPath);
    const crumbs = paths.slice(0, -1);
    const current = paths.at(-1);

    const size = 14;
    const pathEls: ReactNode[] = [];

    for (const crumb of crumbs) {
        pathEls.push(<div key={crumb.name} className={styles.crumb} onClick={() => {
            router.push(crumb.href);
        }}>
            <Text size={size}>{crumb.name}</Text>
        </div>);
    }
    if (current) pathEls.push(<div key={current.name} className={classNames(styles.crumb, styles.current)}>
        <Text size={size}>{current.name}</Text>
    </div>);

    return <div className={styles.crumbs}>
        {intersperseFn(pathEls, (i) => <Text key={`sep${i}`} size={size} className={styles.sep}>&gt;</Text>)}
    </div>;
}
