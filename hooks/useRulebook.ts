import { rulesets } from '@/lib/defs/prints';
import { Sigil, sigilInfos } from '@/lib/defs/sigils';
import { join } from '@/lib/utils';
import { useMemo } from 'react';
import { create } from 'zustand';
import { triggerSound } from './useAudio';

export type Entry = {
    type: typeof ENTRY_TYPES[number];
    id: string;
};
export type EntryMatch = {
    type: string;
    id: string;
    text?: string;
};
export type EntrySegment = {
    type: 'text',
    text: string,
} | {
    type: 'link',
    tag: string,
} | {
    type: 'value',
    text: string,
} | {
    type: 'break'
};
export type EntryData = {
    title: string;
    description: EntrySegment[];
};
const ENTRY_TYPES = ['base', 'sigil', 'print'] as const;
const ENTRY_PATTERN = /(?:(?<type>\w+):)?(?<id>\w+)(?:\|(?<text>[\w ]+))?/;
const BASE_ENTRIES = 'power health blood bones energy mox activate'.split(' ');

interface RulebookStore {
    entry: Entry | null;
    currentRuleset: string;
    open(entry: Entry): void;
    close(): void;
}

export const useRulebook = create<RulebookStore>(
    (set, get) => ({
        entry: null,
        currentRuleset: Object.keys(rulesets)[0],
        open: (entry) => set({ entry }),
        close: () => set({ entry: null }),
    }),
);

export function openInRulebook(entryTag: string) {
    console.debug(`Looking up [${entryTag}]`);
    const entry = parseEntryTag(entryTag);
    if (!entry) return;

    const rulebookStore = useRulebook.getState();
    if (!rulebookStore.entry) triggerSound('rulebookOpen');
    else triggerSound('rulebookFlip');

    rulebookStore.open(entry);
}

export function matchEntryTag(entryTag: string): EntryMatch | null {
    const match = entryTag.match(ENTRY_PATTERN)?.groups as EntryMatch | null;
    if (match && !match.type) match.type = 'base';
    return match;
}
export function parseEntryTag(entryTag: string): Entry | null {
    const match = matchEntryTag(entryTag);
    if (!match) {
        console.log('Could not parse entry tag: %o', entryTag);
        return null;
    }
    if (!ENTRY_TYPES.includes(match.type as never)) {
        console.log('Invalid entry type: %o', match.type);
        return null;
    }
    const entry: Entry = {
        type: match.type as Entry['type'],
        id: match.id,
    };
    if (!isEntryValid(entry)) {
        console.log('Invalid entry: %o', entry);
        return null;
    }
    return entry;
}

export function useEntryData(): EntryData | null {
    const entry = useRulebook(state => state.entry);
    const ruleset = useRulebook(state => state.currentRuleset);
    return useMemo(() => {
        const entryData = getEntryData(entry, ruleset);
        if (!entryData) return null;
        entryData.description.forEach((segment, i, segs) => {
            if (segment.type === 'text' && segs[i + 1]?.type === 'link') {
                const link = segs[i + 1] as Extract<EntrySegment, { type: 'link' }>;
                if (segment.text.endsWith('(n) ')) {
                    const linkText = getEntryTagDisplay(ruleset, link.tag);
                    const article = 'aeiou'.includes(linkText[0]) ? 'n ' : ' ';
                    segment.text = segment.text.slice(0, -4) + article;
                }
            }
            return segment;
        });
        return entryData;
    }, [entry, ruleset]);
}

export function getEntryData(entry: Entry | null, ruleset: string): EntryData | null {
    if (!entry) return null;
    if (entry.type === 'sigil') {
        const sigil = entry.id as Sigil;
        const info = sigilInfos[sigil];
        if (!info) return console.warn('Missing sigil entry: %o', sigil), null;
        const segments = info.description.split(/(\{.+?\}|\[.+?\])/).filter(s => s).map((frag): EntrySegment => {
            format: if (frag.startsWith('{')) {
                const paramIdx = +frag.slice(1, -1);
                const paramType = info.params?.[paramIdx];
                if (!paramType) break format;
                const paramValues = rulesets[ruleset].sigilParams[sigil as never];
                if (paramType === 'number') return { type: 'value', text: `${paramValues[paramIdx]}` };
                if (paramType === 'print') return { type: 'link', tag: `print:${paramValues[paramIdx]}` };
            } else if (frag.startsWith('[')) {
                return { type: 'link', tag: frag.slice(1, -1) };
            }
            return { type: 'text', text: frag };
        });
        return {
            title: info.name,
            description: segments,
        };
    } else if (entry.type === 'print') {
        const print = rulesets[ruleset].prints[entry.id];
        if (!print) return null;

        const segmentParts: EntrySegment[][] = [];

        if (print.desc) segmentParts.push([{ type: 'text', text: print.desc }]);

        for (const sigil of print.sigils ?? []) {
            const sigilData = getEntryData({ type: 'sigil', id: sigil }, ruleset);
            if (!sigilData) continue;
            segmentParts.push([
                { type: 'link', tag: `sigil:${sigil}` },
                { type: 'text', text: ': ' },
                ...sigilData.description,
            ]);
        }

        if (print.evolution) {
            segmentParts.push([
                { type: 'text', text: 'Evolves into ' },
                { type: 'link', tag: `print:${print.evolution}` },
            ]);
        }

        for (const sigil of print.tribes ?? []) {
            const sigilData = getEntryData({ type: 'sigil', id: sigil }, ruleset);
            if (!sigilData) continue;
            segmentParts.push([
                { type: 'link', tag: `sigil:${sigil}` },
                { type: 'text', text: ': ' },
                ...sigilData.description,
            ]);
        }

        return {
            title: print.name,
            description: join<EntrySegment>(segmentParts, { type: 'break' }),
        };
    }
    return null;
}

export function isEntryValid(entry: Entry) {
    if (entry.type === 'base') return BASE_ENTRIES.includes(entry.id);
    if (entry.type === 'sigil') return !!sigilInfos[entry.id];
    if (entry.type === 'print') return Object.values(rulesets).some(({ prints }) => !!prints[entry.id]);
}

export function getEntryTagDisplay(ruleset: string, entryTag: string) {
    const match = matchEntryTag(entryTag);
    const entry = parseEntryTag(entryTag);
    if (!entry) return '(Missing Entry)';
    let text = entry.id;
    if (entry.type === 'sigil') text = sigilInfos[entry.id]?.name;
    if (entry.type === 'print') text = rulesets[ruleset].prints[entry.id]?.name;
    if (match?.text) text = match.text;
    return text;
}
