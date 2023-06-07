import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type VolumeType = 'all' | 'sfx' | 'music';

interface SettingsStore {
    volume: Record<VolumeType, number>;
    setVolume(type: VolumeType, value: number): void;
    getVolume(type: VolumeType): number;
}
export const useSettingsStore = create(
    persist<SettingsStore>(
        (set, get) => ({
            volume: { all: 0.5, sfx: 1, music: 0.7 },
            setVolume: (type, value) => set(state => ({
                ...state, volume: {
                    ...state.volume,
                    [type]: value,
                },
            })),
            getVolume: (type) => get().volume.all * get().volume[type],
        }),
        {
            name: 'settings',
            storage: createJSONStorage(() => localStorage),
        },
    )
);
