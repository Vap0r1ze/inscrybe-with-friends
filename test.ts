import { initCardFromPrint } from './lib/engine/Card';
import { createFight } from './lib/engine/Fight';
import { FightContext, FightPacket, createContext, handleAction, startGame } from './lib/engine/Context';
import { prints } from './lib/defs/prints';
import { writeFileSync } from 'fs';
import { inspect } from 'util';

const fight = createFight({
    lanes: 4,
    lives: 2,
    hammersPerTurn: 1,
    features: [],
    startingHand: 4,
}, ['player', 'opposing']);

const MAIN_DECK = ['stoat', 'bullfrog', 'wolf', 'oppossum', 'ringWorm'];

const ctx = createContext(fight, {
    getCardsFromDeck: async (side, deck, idxs) => {
        if (deck === 'side') return idxs.map(() => initCardFromPrint('squirrel'));
        return idxs.map(idx => initCardFromPrint(MAIN_DECK[idx]));
    },
    initDeck: async (side, deck) => {
        if (deck === 'side') return Array.from({ length: 10 }, (_, i) => i);
        return Array.from({ length: MAIN_DECK.length }, (_, i) => i);
    },
}, {});

function prettyPacket(packet: FightPacket) {
    const lines: string[] = [];
    for (const { type, ...data } of packet.settled) {
        lines.push(`${type}: ${inspect(data)}`);
    }
    if (packet.waitingFor) {
        const { side, event, req, sigil } = packet.waitingFor;
        const { type: reqType, ...reqData } = req;
        lines.push(`waitingFor: ${side} to ${req.type} from ${event.type} as ${sigil} with ${inspect(reqData)}`);
    }
    return lines.join('\n') + '\n\n';
}
function prettyBoard(ctx: FightContext) {
    const lines: string[] = [];
    const field = {
        opposing: ctx.fight.field.opposing.map((card, lane) => card ? prints[card.print].name : ''),
        player: ctx.fight.field.player.map((card, lane) => card ? prints[card.print].name : ''),
    };
    const namePad = Math.max(...Object.values(field).flat().map(name => name.length));

    lines.push('Opposing Hand: ' + ctx.fight.hands.opposing.map(card => `[${prints[card.print].name}]`).join(' '));
    lines.push(Object.values(field).map(row => row.map(name => `[${name.padEnd(namePad)}]`).join(' ')).join('\n'));
    lines.push('Player Hand: ' + ctx.fight.hands.player.map(card => `[${prints[card.print].name}]`).join(' '));

    return lines.join('\n');
}

let log = '';

async function main() {
    log += '-- Game Start --\n';
    log += prettyPacket(await startGame(ctx));
    log += `-- Info --\n${prettyBoard(ctx)}\n\n`;
    log += prettyPacket(await handleAction(ctx, 'player', {
        type: 'bellRing',
    }));
}

main().finally(() => {
    writeFileSync('test.txt', log, 'utf8');
});
