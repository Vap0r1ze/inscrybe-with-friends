import styles from './DiscordPopup.module.css';
import { Button } from '@/components/inputs/Button';
import { Box } from '@/components/ui/Box';
import { Text } from '@/components/ui/Text';
import { useEffect, useState } from 'react';

const DISCORD_LINK = 'https://discord.gg/me2Me5ztMz';

export function DiscordPopup() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (localStorage.getItem('discordPopupSeed')) return;
        setOpen(true);
    }, []);

    function close() {
        setOpen(false);
        localStorage.setItem('discordPopupSeed', 'true');
    }

    if (!open) return null;
    return <div className={styles.backdrop}>
        <Box className={styles.modal} onClick={event => event.stopPropagation()}>
            <Text size={24}>Hi players!</Text>
            <Text size={12}>I made a <a className={styles.discordLink} href={DISCORD_LINK} target="_blank">Discord server</a> for Inscrybe w/ Friends</Text>
            <Text size={12}>At some point I may have more time to work on this fangame, and I would love to hear your feedback on things</Text>
            <Button onClick={() => close()}><Text>Omg sick I joined</Text></Button>
            <Button onClick={() => close()}><Text>I&apos;ll join later in Settings</Text></Button>
        </Box>
    </div>;
}
