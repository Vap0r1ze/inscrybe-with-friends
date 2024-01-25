import styles from './Settings.module.css';
import { useState } from 'react';
import { VolumeType, useSettingsStore } from '@/hooks/useSettings';
import { triggerSound } from '@/hooks/useAudio';
import { Asset } from '../sprites/Asset';
import { HoverBorder } from '../ui/HoverBorder';
import { Box } from '../ui/Box';
import { Text } from '../ui/Text';
import { Range } from '../inputs/Range';
import { Button } from '../inputs/Button';

const DISCORD_LINK = 'https://discord.gg/me2Me5ztMz';

export function Settings() {
    const [open, setOpen] = useState(false);

    return <>
        <div
            className={styles.modalButton}
            data-hover-target
            data-hover-blip
            onClick={() => setOpen(open => !open)}
        >
            <Asset path="/assets/settings.png" />
            <HoverBorder color="--ui-dark" inset={-2} />
        </div>
        {open && <div className={styles.backdrop} onClick={() => setOpen(false)}>
            <Box className={styles.modal} onClick={event => event.stopPropagation()}>
                <VolumeSetting type="all" />
                <VolumeSetting type="music" />
                <VolumeSetting type="sfx" />
                <a className={styles.discordLink} href={DISCORD_LINK} target="_blank">
                    <Button className={styles.discordButton} border="--discord-dark"><Text>Join Discord</Text></Button>
                </a>
            </Box>
        </div>}
    </>;
}

const volumeLabel: Record<VolumeType, string> = {
    all: 'MASTER VOLUME',
    music: 'MUSIC VOLUME',
    sfx: 'SOUND EFFECT VOLUME',
};
function VolumeSetting({ type }: { type: VolumeType }) {
    const [volume, setVolume] = useSettingsStore(state => [state.volume[type], state.setVolume]);

    const onChange = (vol: number) => {
        setVolume(type, vol);
        triggerSound('select');
    };

    return <div className={styles.group}>
        <Text size={16}>{volumeLabel[type]}</Text>
        <Range min={0} max={1} steps={10} value={volume} onChange={onChange} type="sound" />
    </div>;
}
