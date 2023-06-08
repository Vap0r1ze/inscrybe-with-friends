import { Spritesheet } from '@/lib/spritesheets';
import { BattleSprites } from '@/lib/spritesheets/battle';
import { useMemo } from 'react';
import { create } from 'zustand';

interface BattleThemeStore {
    theme: string;
}
export const useBattleThemeStore = create<BattleThemeStore>((set, get) => ({
    theme: 'nature',
}));

export function useBattleSheet(): Spritesheet {
    const theme = useBattleThemeStore(state => state.theme);
    const sheet = useMemo(() => BattleSprites(theme), [theme]);
    return sheet;
}
