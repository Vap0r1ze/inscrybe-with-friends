import { random } from '@/lib/utils';
import { throttle } from 'lodash';
import { useSettingsStore } from './useSettings';
import { isClient } from '@/lib/utils';
import * as Tone from 'tone';
import { Action } from '@/lib/engine/Actions';
import { Event } from '@/lib/engine/Events';
import { FightClient } from './useClientStore';

// Music

// TODO

// SFX

declare global {
    interface Window {
        SfxSampler: Tone.Sampler;
    }
}

type Sound = keyof typeof notes;

const notes = {
    blip: 'D3',
    rulebookOpen: 'C1',
    rulebookFlip: ['C#1', 'D1', 'D#1'],
    bellRing: 'E1',
    attack: 'F1',
    death: 'F#1',
    sac: 'G1',
    select: 'G#1',
    hammer: 'A1',
    spend: 'A#1',
    error: 'B1',
    points: 'C2',
    loseLife: 'C#2',
};
const sampler = isClient ? new Tone.Sampler({
    urls: {
        [notes.blip]: 'crunch_blip.wav',
        [notes.select]: 'beep.wav',
        [notes.spend]: 'spend.mp3',
        [notes.error]: 'toneless_negate.wav',
        [notes.rulebookOpen]: 'rulebook_open.mp3',
        [notes.rulebookFlip[0]]: 'rulebook_flip_1.mp3',
        [notes.rulebookFlip[1]]: 'rulebook_flip_2.mp3',
        [notes.rulebookFlip[2]]: 'rulebook_flip_3.mp3',
        [notes.bellRing]: 'toneless_ring.mp3',
        [notes.attack]: 'attack_nature.wav',
        [notes.death]: 'death.wav',
        [notes.sac]: 'sacrifice.wav',
        [notes.hammer]: 'crunch_blip_2.wav',
        [notes.points]: 'crunch_blip_2.wav',
        [notes.loseLife]: 'lose_life.mp3',
    },
    baseUrl: '/audio/',
}).toDestination() : null as never;

const volumes: Partial<Record<Sound, number>> = {
    blip: 0.7,
    bellRing: 1,
    hammer: 0.8,
    attack: 0.9,
    death: 0.9,
    sac: 0.9,
    select: 1.2,
    rulebookOpen: 0.9,
    rulebookFlip: 0.9,
    error: 0.9,
    points: 0.6,
};

function getNote(sound: Sound) {
    const soundNotes = notes[sound];
    const note = Array.isArray(soundNotes) ? random(soundNotes) : soundNotes;
    const volume = useSettingsStore.getState().getVolume('sfx') * (volumes[sound] ?? 1);
    sampler.volume.setValueAtTime(20*Math.log(volume), '+0');
    return note;
}
function playSound(sound: Sound) {
    sampler.triggerAttackRelease([getNote(sound)], '+0');
}
const soundPlayers: Partial<Record<Sound, () => void>> = {
    blip: throttle(() => playSound('blip'), 100, { trailing: false }),
};

export function triggerSound(sound: Sound) {
    if (!sampler.loaded || sampler.disposed || Tone.now() < 1) return;
    try {
        if (soundPlayers[sound]) soundPlayers[sound]!();
        else playSound(sound);
    } catch (error) {
        console.error(error);
    }
}

export function triggerActionSound(action: Action) {
    if (action.type === 'bellRing') triggerSound('bellRing');
    if (action.type === 'hammer') triggerSound('hammer');
    if (action.type === 'activate') triggerSound('select');
}
export function triggerEventSound(event: Event, client?: FightClient) {
    if (event.type === 'attack') {
        triggerSound('attack');
    } else if (event.type === 'perish') {
        if (event.cause === 'sac') triggerSound('sac');
        else triggerSound('death');
    } else if (event.type === 'draw') {
        playSound('blip');
    } else if (event.type === 'lifeLoss') {
        playSound('loseLife');
    } else if (event.type === 'play' || event.type === 'move') {
        playSound('blip');
    } else if (event.type === 'phase') {
        // Emulate the opponent's bell-ring action sound
        if (event.phase === 'pre-attack' && client?.fight.turn.side !== 'player') playSound('bellRing');
    }
}

// Development
if (isClient) {
    window.SfxSampler?.dispose();
    window.SfxSampler = sampler;
}
