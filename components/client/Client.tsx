import styles from './Client.module.css';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { ClientContext, animationDurations, useClientStore } from '@/hooks/useClientStore';
import { CSSProperties, memo } from 'react';
import { Box } from '../ui/Box';
import { Text } from '../Text';
import { Board } from './Board';
import { LeftInfo } from './LeftInfo';
import { RightInfo } from './RightInfo';
import { Hand } from './Hand';
import { DebugEvents, DebugInfo } from './Debug';
import { NSlice } from '../ui/NSlice';
import { useBattleTheme } from '@/hooks/useBattleTheme';

export interface ClientProps {
    id: string
    debug?: boolean
}
export const Client = memo(function Client({ id, debug }: ClientProps) {
    const battleTheme = useBattleTheme();
    const client = useClientStore(state => state.clients[id]);

    const onDismissError = () => {
        useClientStore.getState().setClient(id, client => ({ ...client, errors: client.errors.slice(1) }));
    };

    const animationVars: Record<string, string> = {};
    for (const [key, value] of Object.entries(animationDurations)) {
        animationVars[`--event-${key}-duration`] = `${value}s`;
    }

    return <div className={styles.root}>
        <ErrorBoundary fallbackRender={ClientError}>
            {client ? <div className={styles.client} style={{
                '--lane-count': client.fight.opts.lanes,
                ...animationVars,
            } as CSSProperties}>
                <ClientContext.Provider value={id}>
                    <LeftInfo />
                    <Board />
                    <RightInfo />
                    <NSlice
                        className={styles.middle}
                        sheet={battleTheme}
                        name="middle"
                        cols={[0]}
                        rows={[4]}
                    />
                    <Hand />
                    {debug && <><DebugEvents /><DebugInfo /></>}
                    {client.errors[0] != null && <div className={styles.errorBackdrop} onClick={onDismissError}>
                        <div className={styles.error} onClick={e => e.stopPropagation()}>
                            <Box>
                                <Text size={12}>{client.errors[0]}</Text>
                            </Box>
                        </div>
                    </div>}
                </ClientContext.Provider>
            </div> : <Box className={styles.missing}>
                <Text size={20}>CLIENT MISSING</Text>
            </Box>}
        </ErrorBoundary>
    </div>;
});

const realTrace = /^ *at ([\w$.]+) \((?:[\w\-]+:\/\/\/?)?(.+?\.tsx?):(\d+):(\d+)\)$/;
const ClientError = ({ error }: FallbackProps) => {
    let stack: string[] = [];
    if (error instanceof Error && error.stack) {
        for (const line of error.stack.split('\n').slice(1))
            if (realTrace.test(line)) stack.push(line.replace(realTrace, '$1 @ $2:$3:$4'));
    }
    return <Box className={styles.missing}>
        <Text size={20}>CLIENT ERROR</Text>
        <Text size={14}>{`${error}`}</Text>
        {stack.map((line, i) => <Text key={i}>{line}</Text>)}
    </Box>;
};
