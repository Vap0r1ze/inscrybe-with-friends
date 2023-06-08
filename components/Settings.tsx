import { useState } from 'react';
import styles from './Settings.module.css';
import { Asset } from './sprites/Asset';
import { HoverBorder } from './ui/HoverBorder';
import { Box } from './ui/Box';
import { VolumeType, useSettingsStore } from '@/hooks/useSettings';
import { triggerSound } from '@/hooks/useAudio';
import { Text } from './ui/Text';
import { Range } from './inputs/Range';

export function Settings() {
    const [open, setOpen] = useState(false);

    return <>
        <div data-hover-target data-hover-blip className={styles.modalButton} onClick={() => setOpen(open => !open)}>
            <Asset path="/assets/settings.png" />
            <HoverBorder color="--ui-dark" inset={-2} />
        </div>
        {open && <div className={styles.backdrop} onClick={() => setOpen(false)}>
            <Box className={styles.modal} onClick={event => event.stopPropagation()}>
                <VolumeSetting type="all" />
                <VolumeSetting type="music" />
                <VolumeSetting type="sfx" />
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
        console.log('Setting %s to %o', type, vol);
        setVolume(type, vol);
        triggerSound('select');
    };

    return <div className={styles.volume}>
        <Text size={16}>{volumeLabel[type]}</Text>
        <Range min={0} max={1} steps={10} value={volume} onChange={onChange} type="sound" />
    </div>;
}
