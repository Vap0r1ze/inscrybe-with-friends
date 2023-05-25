import { createKVStore } from './createStore';

const settings = {
    fx: true,
    scanlines: true,
    volume: 1,
};

export const [useSettings, setSetting] = createKVStore(settings);

// try {
//     Object.assign(settings, JSON.parse(localStorage.getItem('settings') ?? '{}'));
// } catch {}
