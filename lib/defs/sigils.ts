import { ActionReq, ActionRes } from '../engine/Actions';
import { CardPos, getCircuit, getMoxes } from '../engine/Card';
import { MoxType, SigilParam, SigilParamType } from '../engine/constants';
import { EffectTarget, EffectTriggers } from '../engine/Effects';
import { ErrorType, FightError } from '../engine/Errors';
import { cardCanPush, lists, positions } from '../engine/utils';
import { entries, fromEntries } from '../utils';
import { Buff } from './buffs';

export type SigilPos = [CardPos, Sigil];
export type Sigil = keyof typeof SIGIL_INFOS;
export interface SigilInfo {
    name: string;
    description: string;
    buffs?: readonly Buff[];
    params?: readonly SigilParamType[];
}
export interface SigilEffects<S extends Sigil = never> extends EffectTriggers<S> {
    runAfter?: readonly string[];
    runAs?: EffectTarget;
    runAt?: CardPos[0];
}
export interface SigilDef extends SigilInfo, SigilEffects {}

export type SigilParamMap = {
    -readonly [K in keyof typeof SIGIL_INFOS]: typeof SIGIL_INFOS[K] extends { params: infer P extends readonly SigilParamType[] } ? {
        -readonly [I in keyof P]: SigilParam<P[I]>
    } : never;
};

const SIGIL_INFOS = {
    // Act I
    airborne: {
        name: 'Airborne',
        description: 'This card will ignore opposing cards and strike an opponent directly.',
    },
    antSpawner: {
        name: 'Ant Spawner',
        description: 'When this card is played, a(n) {0} enters your hand.',
        params: ['print'],
    },
    beesWithin: {
        name: 'Bees Within',
        description: 'When this card is struck, a(n) {0} is created in your hand.',
        params: ['print'],
    },
    bellist: {
        name: 'Bellist',
        description: 'When this card is played, a(n) {0} is created on each adjacent empty space.',
        params: ['print'],
    },
    bombSpewer: {
        name: 'Bomb Spewer',
        description: 'When this card is played, all empty spaces are filled with a(n) {0}.',
        params: ['print'],
    },
    boneDigger: {
        name: 'Bone Digger',
        description: 'At the end of the owner\'s turn, this card generates {0} [bones|Bone].',
        params: ['number'],
    },
    boneless: {
        name: 'Boneless',
        description: 'When a card bearing this sigil dies, no [bones] are awarded.',
    },
    brittle: {
        name: 'Brittle',
        description: 'After attacking, this card perishes.',
    },
    chaseAttack: {
        name: 'Burrower',
        description: 'This card will move to any empty space that is attacked by an enemy to block it.',
    },
    chaseOpposingPlay: {
        name: 'Guardian',
        description: 'When an opposing card is played opposite an empty space, this card moves to that space.',
    },
    corpseEater: {
        name: 'Corpse Eater',
        description: 'If a card that you own dies by combat, this card is played from your hand on its space.',
    },
    damBuilder: {
        name: 'Dam Builder',
        description: 'When this card is played, a(n) {0} is created on each adjacent empty space.',
        params: ['print'],
    },
    deathTouch: {
        name: 'Death Touch',
        description: 'This card instantly kills any card it damages.',
    },
    detonator: {
        name: 'Detonator',
        description: 'When this card dies, adjacent and opposing cards are dealt {0} damage.',
        params: ['number'],
    },
    doubleAttack: {
        name: 'Double Strike',
        description: 'A card bearing this sigil will strike the opposing space an extra time when attacking.',
    },
    doubleDeath: {
        name: 'Double Death',
        description: 'When another creature you own dies, it dies again.',
    },
    drawCopy: {
        name: 'Fecundity',
        description: 'When this card is played, a copy of it enters your hand.',
    },
    drawRabbit: {
        name: 'Rabbit Hole',
        description: 'When this card is played, a Rabbit is created in your hand.',
    },
    evolve: {
        name: 'Fledgling',
        description: 'A card bearing this sigil will grow into it\'s evolution after 1 turn on the board.',
    },
    fourBones: {
        name: 'Bone King',
        description: 'When this card dies, 4 [bones|Bones] are awarded instead of 1.',
    },
    frozen: {
        name: 'Frozen Away',
        description: 'When this card perishes, the creature inside takes its place.',
    },
    gainBattery: {
        name: 'Battery Bearer',
        description: 'When this card is played, you gain an [energy|Energy Cell].',
    },
    hoarder: {
        name: 'Hoarder',
        description: 'When this card is played, choose a card from your deck to be drawn immediately.',
    },
    leader: {
        name: 'Leader',
        description: 'Creatures adjacent to this card gain 1 [power|Power].',
        buffs: ['incrAdjPower'],
    },
    looter: {
        name: 'Looter',
        description: 'When this card deals damage directly, draw a card for each damage dealt.',
    },
    manyLives: {
        name: 'Many Lives',
        description: 'When this card is sacrificed, it does not perish.',
    },
    mightyLeap: {
        name: 'Mighty Leap',
        description: 'This card blocks opposing Airborne creatures.',
    },
    sentry: {
        name: 'Sentry',
        description: 'When a card moves into the space opposing this card, they are dealt 1 damage.',
    },
    sharp: {
        name: 'Sharp Quills',
        description: 'Once this card is struck, the striker is dealt 1 damage.',
    },
    sniper: {
        name: 'Sniper',
        description: 'You may choose which opposing spaces this card strikes.',
    },
    stinky: {
        name: 'Stinky',
        description: 'The creature opposing this card loses 1 [power|Power].',
        buffs: ['decrOppPower'],
    },
    stone: {
        name: 'Made of Stone',
        description: 'A card bearing this sigil is immune to the effects of Touch of Death and Stinky.',
    },
    skeletonStrafe: {
        name: 'Skeleton Crew',
        description: 'At the end of the owner\'s turn, this card moves in the sigil\'s direction and plays a(n) {0} in the space behind it.',
        params: ['print'],
    },
    squirrelStrafe: {
        name: 'Squirrel Shedder',
        description: 'At the end of the owner\'s turn, this card moves in the sigil\'s direction and plays a(n) {0} in the space behind it.',
        params: ['print'],
    },
    strafe: {
        name: 'Strafe',
        description: 'At the end of the owner\'s turn, this card moves in the sigil\'s direction.',
    },
    strafePush: {
        name: 'Hefty',
        description: 'At the end of the owner\'s turn, this and adjacent cards move in the sigil\'s direction.',
    },
    threeSacs: {
        name: 'Worthy Sacrifice',
        description: 'This card counts as 3 [blood|Blood] rather than 1 [blood|Blood] when sacrificed.',
    },
    tristrike: {
        name: 'Trifurcated Strike',
        description: 'This card will deal damage to the opposing spaces left, right, and opposite of it.',
    },
    bistrike: {
        name: 'Bifurcated Strike',
        description: 'This card will strike each opposing space to the left and right of the spaces across it.',
    },
    unkillable: {
        name: 'Unkillable',
        description: 'When this card perishes, a copy of it enters your hand.',
    },
    voidDamage: {
        name: 'Repulsive',
        description: 'If a creature would attack this card, it does not.',
    },
    waterborne: {
        name: 'Waterborne',
        description: 'On the opponent\'s turn, creatures attacking this card\'s space attack directly.',
    },
    waterborneTentacle: {
        name: 'Kraken Waterborne',
        description: 'Same as [sigil:waterborne|Waterborne], except that this card becomes a [tribe:Tentacle|Tentacle] card when it emerges.',
    },

    // Mox
    buffGems: {
        name: 'Gem Animator',
        description: '[tribe:mox|Mox] cards on the owner\'s side of the board gain 1 Power.',
        buffs: ['incrMoxPower'],
    },
    dropRubyOnDeath: {
        name: 'Ruby Heart',
        description: 'When this card perishes, a [print:moxO|Ruby Mox] replaces it.',
    },
    gainGemAll: {
        name: 'Great Mox',
        description: 'While this card is on the board, it provides all 3 [mox|Gems] to its owner.',
    },
    gainGemGreen: {
        name: 'Green Mox',
        description: 'While this card is on the board, it provides a Green [mox|Gem].',
    },
    gainGemOrange: {
        name: 'Orange Mox',
        description: 'While this card is on the board, it provides an Orange [mox|Gem].',
    },
    gainGemBlue: {
        name: 'Blue Mox',
        description: 'While this card is on the board, it provides a Blue [mox|Gem].',
    },
    gemsDraw: {
        name: 'Mental Gemnastics',
        description: 'When this card is played, you draw cards equal to the amount of your [tribe:mox|Mox] cards played.',
    },
    gemDependant: {
        name: 'Gem Dependant',
        description: 'If this card\'s owner controls no [tribe:mox|Mox] cards, this card perishes.',
    },

    // Buttons
    activatedStatsUp: {
        name: 'Enlarge',
        description: '[activate|Activate]: Pay {0} [bones|Bones] to increase the [power|Power] and [health|Health] of this card by {1}.',
        params: ['number', 'number'],
    },
    activatedStatsUpEnergy: {
        name: 'Stimulate',
        description: '[activate|Activate]: Pay {0} [energy|Energy] to increase the [power|Power] and [health|Health] of this card by {1}.',
        params: ['number', 'number'],
    },
    activatedEnergyToBones: {
        name: 'Bonehorn',
        description: '[activate|Activate]: Pay {0} [energy|Energy] to gain {1} [bones|Bone].',
        params: ['number', 'number'],
    },
    activatedDiceRollEnergy: {
        name: 'Power Dice',
        description: '[activate|Activate]: Pay {0} [energy|Energy] to set the [power|Power] of this card randomly between 1 and 6.',
        params: ['number'],
    },
    activatedDrawSkeleton: {
        name: 'Disentomb',
        description: '[activate|Activate]: Pay {0} [bones|Bone] to create a(n) {1} in your hand.',
        params: ['number', 'print'],
    },
    activatedSacrificeDraw: {
        name: 'True Scholar',
        description: '[activate|Activate]: If you have a Blue [mox|gem], destroy this card to draw 3 cards.',
        params: ['number'],
    },
    activatedDealDamage: {
        name: 'Energy Gun',
        description: '[activate|Activate]: Pay {0} [energy|Energy] to deal {1} damage to the space across from this card.',
        params: ['number', 'number'],
    },

    conduitGainEnergy: {
        name: 'Energy Conduit',
        description: 'If this card completes a [circuit] when it\'s owner ends their turn, their max [energy|Energy] is increased by {0}.',
        params: ['number'],
    },
    conduitGainPower: {
        name: 'Attack Conduit',
        description: 'Other creatures within a [circuit] completed by this card gain 1 [power|Power].',
        buffs: ['incrCircuitPower'],
    },
    conduitSpawner: {
        name: 'Spawn Conduit',
        description: 'If this card creates a [circuit], a(n) {0} is played in each empty space inside this card\'s circuit at the end of the owner\'s turn.',
        params: ['print'],
    },

    // Custom
    vampiric: {
        name: 'Vampiric',
        description: 'When this card attacks another, it heals for the amount of damage dealt.',
    },
} as const satisfies Record<string, SigilInfo>;

const SIGIL_EFFECTS = {
    airborne: {
        runAs: 'played',
        preSettleWrite: {
            attack(event) { event.direct = true; },
        },
    },
    antSpawner: {
        runAs: 'played',
        postSettle: {
            play(event, [print]) {
                this.createEvent('draw', {
                    side: this.side,
                    card: this.initCard(print),
                });
            },
        },
    },
    beesWithin: {
        runAs: 'attackee',
        preSettleRead: {
            attack(event, [print]) {
                this.createEvent('draw', {
                    side: this.side,
                    card: this.initCard(print),
                });
            },
        },
    },
    bellist: {
        runAs: 'played',
        postSettle: {
            play(event, [print]) {
                this.createEvent('play', {
                    pos: [this.side, event.pos[1] - 1],
                    card: this.initCard(print),
                });
                this.createEvent('play', {
                    pos: [this.side, event.pos[1] + 1],
                    card: this.initCard(print),
                });
            },
        },
    },
    bombSpewer: {
        runAs: 'played',
        postSettle: {
            play(event, [print]) {
                for (const [side, lanes] of entries(this.tick.fight.field)) {
                    for (let lane = 0; lane < lanes.length; lane++) {
                        if (lanes[lane]) continue;
                        this.createEvent('play', {
                            pos: [side, lane],
                            card: this.initCard(print),
                        });
                    }
                }
            },
        },
    },
    boneDigger: {
        runAt: 'field',
        postSettle: {
            phase(event, [bones]) {
                if (event.phase !== 'post-attack') return;
                this.createEvent('bones', {
                    side: this.side,
                    amount: bones,
                });
            },
        },
    },
    brittle: {
        runAs: 'played',
        preSettleRead: {
            attack(event) {
                this.createEvent('perish', { pos: event.from, cause: 'attack' });
            },
        },
    },
    chaseAttack: {
        runAt: 'field',
        preSettleWrite: {
            attack(event) {
                // TODO: centralize this logic
                if (event.direct && !this.card.state.sigils.includes('mightyLeap')) return;
                if (event.to[0] !== this.side) return;
                const target = this.getCard(event.to);
                if (target) return;

                this.prependEvent('move', {
                    from: this.fieldPos!,
                    to: event.to,
                });
            },
        },
    },
    chaseOpposingPlay: {
        runAt: 'field',
        preSettleRead: {
            play(event) {
                if (event.pos[0] === this.side || event.pos[1] === this.fieldPos![1]) return;
                this.createEvent('move', {
                    from: this.fieldPos!,
                    to: positions.opposing(event.pos),
                });
            },
        },
    },
    corpseEater: {
        runAt: 'hand',
        runAs: 'global',
        postSettle: {
            perish(event) {
                if (event.cause === 'sac' || event.cause === 'hammer') return;
                if (!this.tryMark('corpseEater')) return;
                const [side, idx] = this.handPos!;
                if (side !== event.pos[0]) return;
                this.createEvent('play', {
                    pos: event.pos,
                    card: this.tick.fight.hands[side][idx],
                    fromHand: this.handPos!,
                });
            },
        },
    },
    damBuilder: {
        runAs: 'played',
        postSettle: {
            play(event, [print]) {
                this.createEvent('play', {
                    pos: [this.side, event.pos[1] - 1],
                    card: this.initCard(print),
                });
                this.createEvent('play', {
                    pos: [this.side, event.pos[1] + 1],
                    card: this.initCard(print),
                });
            },
        },
    },
    deathTouch: {
        runAs: 'played',
        preSettleRead: {
            attack(event) {
                if (event.direct) return;
                const target = this.getCard(event.to);
                if (!target) return;
                if (target.state.sigils.includes('stone')) return;
                this.createEvent('perish', {
                    pos: event.to,
                    cause: 'death-touch',
                });
            },
        },
    },
    detonator: {
        runAs: 'played',
        preSettleWrite: {
            perish(event, [damage]) {
                if (event.cause === 'sac') return;
                if (!this.tryMark('detonator')) return;
                const opposing = positions.opposing(event.pos);
                const [side, lane] = event.pos;
                this.prependEvent('shoot', {
                    from: event.pos,
                    to: [side, lane - 1],
                    damage,
                });
                this.prependEvent('shoot', {
                    from: event.pos,
                    to: opposing,
                    damage,
                });
                this.prependEvent('shoot', {
                    from: event.pos,
                    to: [side, lane + 1],
                    damage,
                });
            },
        },
    },
    doubleAttack: {
        runAs: 'played',
        preSettleWrite: {
            triggerAttack(event) {
                this.cancelDefault();
                this.createEvent('attack', {
                    from: event.pos,
                    to: positions.opposing(event.pos),
                });
                this.createEvent('attack', {
                    from: event.pos,
                    to: positions.opposing(event.pos),
                });
            },
        },
    },
    drawCopy: {
        runAs: 'played',
        postSettle: {
            play() {
                const card = this.initCard(this.card.print);
                card.state.sigils = lists.subtract(this.card.state.sigils, ['drawCopy']);
                this.createEvent('draw', {
                    side: this.side,
                    card,
                });
            },
        },
    },
    drawRabbit: {
        runAs: 'played',
        postSettle: {
            play() {
                this.createEvent('draw', {
                    side: this.side,
                    card: this.initCard('rabbit'),
                });
            },
        },
    },
    evolve: {
        runAt: 'field',
        postSettle: {
            phase(event) {
                if (event.phase !== 'pre-turn') return;
                const [side] = this.fieldPos!;
                if (this.tick.fight.turn.side !== side) return;
                // TODO: Impl default evolution, maybe a self-buff using CardState['evolved']?
                if (!this.cardPrint.evolution) return;

                let extraSigils = lists.subtract(this.card.state.sigils, this.cardPrint.sigils ?? []);
                extraSigils = lists.subtract(extraSigils, ['evolve']);
                const card = this.initCard(this.cardPrint.evolution);
                card.state.sigils.push(...extraSigils);
                const damage = this.cardPrint.health - this.card.state.health;
                card.state.health -= damage;

                this.createEvent('transform', {
                    pos: this.fieldPos!,
                    card,
                });
            },
        },
    },
    fourBones: {
        runAs: 'played',
        preSettleWrite: {
            perish() {
                this.cancelDefault();
                this.createEvent('bones', {
                    side: this.side,
                    amount: 4,
                });
            },
        },
    },
    frozen: {
        runAs: 'played',
        preSettleRead: {
            perish(event) {
                if (event.cause === 'sac') return;
                const { evolution = 'opossum' } = this.cardPrint;

                this.createEvent('transform', {
                    pos: this.fieldPos!,
                    card: this.initCard(evolution),
                });
            },
        },
    },
    gainBattery: {
        runAs: 'played',
        postSettle: {
            play() {
                this.createEvent('energy', {
                    side: this.side,
                    total: 1,
                    amount: 1,
                });
            },
        },
    },
    hoarder: {
        runAs: 'played',
        requests: {
            play: {
                callFor() {
                    if (this.tick.host.decks[this.side].main.length === 0) return null;

                    return [this.side, {
                        type: 'chooseDraw',
                        deck: 'main',
                        choices: this.tick.host.decks[this.side].main.slice().sort((a, b) => a - b),
                    }];
                },
                async onResponse(event, res: ActionRes<'chooseDraw'>, req: ActionReq<'chooseDraw'>) {
                    if (!req.choices.includes(res.idx)) throw FightError.create(ErrorType.InvalidAction, 'Cannot draw card that is not in deck');
                    const side = event.pos[0];
                    this.createEvent('draw', {
                        side,
                        source: req.deck,
                        idx: res.idx,
                    });
                },
            },
        },
    },
    looter: {
        runAs: 'played',
        postSettle: {
            attack(event) {
                if (!event.direct) return;
                for (let i = 0; i < event.damage!; i++) {
                    this.createEvent('draw', {
                        side: this.side,
                        source: 'main',
                    });
                }
            },
        },
    },
    manyLives: {
        runAs: 'played',
        preSettleWrite: {
            perish(event) {
                if (event.cause === 'sac') this.cancel();
            },
        },
    },
    mightyLeap: {
        runAfter: ['airborne'],
        runAs: 'attackee',
        preSettleWrite: {
            attack(event) {
                const attacker = this.getCard(event.from)!;
                if (!attacker.state.sigils.includes('airborne')) return;

                event.direct = false;
            },
        },
    },
    sentry: {
        runAs: 'opposing',
        postSettle: {
            play(event) {
                if (event.transient) return;

                this.createEvent('attack', {
                    from: this.fieldPos!,
                    to: event.pos,
                    damage: 1,
                });
            },
            move(event) {
                this.createEvent('attack', {
                    from: this.fieldPos!,
                    to: event.to,
                    damage: 1,
                });
            },
        },
    },
    sharp: {
        runAs: 'attackee',
        preSettleRead: {
            attack(event) {
                this.createEvent('attack', {
                    from: this.fieldPos!,
                    to: event.from,
                    damage: 1,
                });
            },
        },
    },
    sniper: {
        runAs: 'played',
        preSettleWrite: {
            triggerAttack(event) {
                this.cancelDefault();
            },
        },
        requests: {
            triggerAttack: {
                callFor: (event) => [event.pos[0], { type: 'snipe' }],
                async onResponse(event, res: ActionRes<'snipe'>) {
                    const target = positions.opposing(event.pos, res.lane);
                    this.createEvent('attack', {
                        from: event.pos,
                        to: target,
                        damage: this.getPower(event.pos)!,
                    });
                },
            },
        },
    },
    skeletonStrafe: {
        runAt: 'field',
        postSettle: {
            phase(event, [print]) {
                if (event.phase !== 'post-attack') return;
                SIGIL_EFFECTS.strafe.postSettle.phase.call(this, event);
                this.createEvent('play', {
                    pos: this.fieldPos!,
                    card: this.initCard(print),
                });
            },
        },
    },
    squirrelStrafe: {
        runAt: 'field',
        postSettle: {
            phase(event, [print]) {
                if (event.phase !== 'post-attack') return;
                SIGIL_EFFECTS.strafe.postSettle.phase.call(this, event);
                this.createEvent('play', {
                    pos: this.fieldPos!,
                    card: this.initCard(print),
                });
            },
        },
    },
    strafe: {
        runAt: 'field',
        postSettle: {
            phase(event) {
                if (event.phase !== 'post-attack') return;
                const [side, lane] = this.fieldPos!;
                if (this.tick.fight.turn.side !== side) return;
                let toLane =  lane + (this.card.state.backward ? -1 : 1);
                let turnAround = false;
                if (this.getCard([side, toLane]) || toLane < 0 || toLane >= this.tick.fight.opts.lanes) {
                    turnAround = true;
                    toLane = lane + (!this.card.state.backward ? -1 : 1);
                };
                this.createEvent('move', {
                    from: this.fieldPos!,
                    to: [side, toLane],
                    turnAround,
                });
            },
        },
    },
    strafePush: {
        runAt: 'field',
        postSettle: {
            phase(event) {
                if (event.phase !== 'post-attack') return;
                const [side, lane] = this.fieldPos!;
                if (this.tick.fight.turn.side !== side) return;
                let dx = this.card.state.backward ? -1 : 1;
                const canPush = cardCanPush(lane, dx, this.tick.fight.field[side]);
                if (!canPush) dx = -dx;
                this.createEvent('push', {
                    from: this.fieldPos!,
                    dx,
                    turnAround: !canPush,
                });
            },
        },
    },
    bistrike: {
        runAs: 'played',
        preSettleWrite: {
            triggerAttack(event) {
                this.cancelDefault();
                const [side, lane] = positions.opposing(event.pos);
                this.createEvent('attack', { from: event.pos, to: [side, lane - 1] });
                this.createEvent('attack', { from: event.pos, to: [side, lane + 1] });
            },
        },
    },
    tristrike: {
        runAs: 'played',
        preSettleWrite: {
            triggerAttack(event) {
                this.cancelDefault();
                const [side, lane] = positions.opposing(event.pos);
                this.createEvent('attack', { from: event.pos, to: [side, lane - 1] });
                this.createEvent('attack', { from: event.pos, to: [side, lane] });
                this.createEvent('attack', { from: event.pos, to: [side, lane + 1] });
            },
        },
    },
    unkillable: {
        runAs: 'played',
        preSettleRead: {
            perish() {
                const card = this.initCard(this.card.print);
                card.state.sigils = this.card.state.sigils;
                // TODO - Redo this using a card print effect system
                if (this.card.print === 'ouroboros' && typeof card.state.power === 'number') {
                    card.state.power += 1;
                    card.state.health += 1;
                }
                this.createEvent('draw', {
                    side: this.side,
                    card,
                });
            },
        },
    },
    voidDamage: {
        runAs: 'attackee',
        preSettleWrite: {
            attack() { this.cancel(); },
        },
    },
    waterborne: {
        runAt: 'field',
        postSettle: {
            phase(event) {
                if (event.phase !== 'pre-turn') return;
                const isRowTurn = this.tick.fight.turn.side === this.side;
                const shouldFlip = +isRowTurn ^ +!this.card.state.flipped;
                if (shouldFlip) this.createEvent('flip', { pos: this.fieldPos! });
            },
        },
    },
    waterborneTentacle: {
        runAt: 'field',
        postSettle: {
            phase(event) {
                if (event.phase !== 'pre-turn') return;

                const isRowTurn = this.tick.fight.turn.side === this.side;
                const shouldFlip = +isRowTurn ^ +!this.card.state.flipped;

                const willEmerge = this.card.state.flipped && shouldFlip;
                transform: if (willEmerge) {
                    const tentacleCards = Object.entries(this.prints).filter(([id, card]) => card.tribes?.includes('tentacle'));
                    const otherTentacleCards = tentacleCards.filter(([id]) => id !== this.card.print);
                    if (!otherTentacleCards.length) break transform;

                    const [tentacleCard] = otherTentacleCards[Math.floor(Math.random() * otherTentacleCards.length)];
                    const card = this.initCard(tentacleCard);
                    card.state.flipped = true;
                    this.createEvent('transform', {
                        pos: this.fieldPos!,
                        card: card,
                    });
                };

                if (shouldFlip) this.createEvent('flip', { pos: this.fieldPos! });
            },
        },
    },
    doubleDeath: {
        runAt: 'field',
        preSettleRead: {
            perish(event) {
                if (event.cause === 'transient') return;
                if (event.pos[0] !== this.side) return;
                if (event.pos[1] === this.fieldPos![1]) return;

                const card = this.getCard(event.pos);
                if (!card) return;

                this.createEvent('play', {
                    pos: event.pos,
                    card,
                    transient: true,
                });
            },
            play(event) {
                if (!event.transient) return;
                this.createEvent('perish', {
                    pos: event.pos,
                    cause: 'transient',
                });
            },
        },
    },
    dropRubyOnDeath: {
        runAs: 'played',
        postSettle: {
            perish() {
                this.createEvent('play', {
                    pos: this.fieldPos!,
                    card: this.initCard('moxO'),
                });
            },
        },
    },
    gemsDraw: {
        runAs: 'played',
        postSettle: {
            play() {
                const [side] = this.fieldPos!;
                const moxCount = this.tick.fight.field[side].filter((pos) => {
                    return pos?.print && this.prints[pos.print].tribes?.includes('mox');
                }).length;
                for (let i = 0; i < moxCount; i++) {
                    this.createEvent('draw', {
                        side: this.side,
                        source: 'main',
                    });
                }
            },
        },
    },
    gemDependant: {
        runAt: 'field',
        postSettle: {
            play() {
                const [side] = this.fieldPos!;
                const moxCount = this.tick.fight.field[side].filter((pos) => {
                    return pos?.print && this.prints[pos.print].tribes?.includes('mox');
                }).length;
                if (moxCount > 0) return;
                this.createEvent('perish', {
                    pos: this.fieldPos!,
                    cause: 'attack',
                });
            },
            phase() {
                if (this.tick.fight.turn.phase !== 'pre-turn' && this.tick.fight.turn.phase !== 'post-attack') return;
                SIGIL_EFFECTS.gemDependant.postSettle.play.call(this);
            },
        },
    },
    activatedStatsUp: {
        runAs: 'played',
        preSettleRead: {
            activate(event, [cost, incr]) {
                const [side] = event.pos;
                if (this.tick.fight.players[side].bones < cost) throw FightError.create(ErrorType.InsufficientResources, 'Not enough bones.');
                this.createEvent('bones', {
                    side,
                    amount: -cost,
                });
                this.createEvent('stats', {
                    pos: event.pos,
                    power: this.getPower(event.pos)! + incr,
                    health: this.card.state.health + incr,
                });
            },
        },
    },
    activatedStatsUpEnergy: {
        runAs: 'played',
        preSettleRead: {
            activate(event, [cost, incr]) {
                const [side] = event.pos;
                if (this.tick.fight.players[side].energy[0] < cost) throw FightError.create(ErrorType.InsufficientResources, 'Not enough energy.');
                this.createEvent('energySpend', {
                    side,
                    amount: cost,
                });
                this.createEvent('stats', {
                    pos: event.pos,
                    power: this.getPower(event.pos)! + incr,
                    health: this.card.state.health + incr,
                });
            },
        },
    },
    activatedEnergyToBones: {
        runAs: 'played',
        preSettleRead: {
            activate(event, [cost, bones]) {
                const [side] = event.pos;
                if (this.tick.fight.players[side].energy[0] < cost) throw FightError.create(ErrorType.InsufficientResources, 'Not enough energy.');
                this.createEvent('energySpend', {
                    side,
                    amount: cost,
                });
                this.createEvent('bones', {
                    side,
                    amount: bones,
                });
            },
        },
    },
    activatedDiceRollEnergy: {
        runAs: 'played',
        preSettleRead: {
            activate(event, [cost]) {
                const [side] = event.pos;
                if (this.tick.fight.players[side].energy[0] < cost) throw FightError.create(ErrorType.InsufficientResources, 'Not enough energy.');
                this.createEvent('energySpend', {
                    side,
                    amount: cost,
                });
                const power = Math.floor(Math.random() * 6) + 1;
                this.createEvent('stats', {
                    pos: event.pos,
                    power,
                });
            },
        },
    },
    activatedDrawSkeleton: {
        runAs: 'played',
        preSettleRead: {
            activate(event, [cost, print]) {
                const [side] = event.pos;
                if (this.tick.fight.players[side].bones < cost) throw FightError.create(ErrorType.InsufficientResources, 'Not enough bones.');
                this.createEvent('bones', {
                    side,
                    amount: -cost,
                });
                this.createEvent('draw', {
                    side,
                    card: this.initCard(print),
                });
            },
        },
    },
    activatedSacrificeDraw: {
        runAs: 'played',
        preSettleRead: {
            activate(event, [amount]) {
                const [side] = event.pos;
                if (!(getMoxes(this.tick.fight.field[side]) & MoxType.Blue))
                    throw FightError.create(ErrorType.InsufficientResources, 'Requires a blue gem.');

                this.createEvent('perish', {
                    pos: event.pos,
                    cause: 'attack',
                });
                for (let i = 0; i < amount; i++) {
                    this.createEvent('draw', {
                        side,
                        source: 'main',
                    });
                }
            },
        },
    },
    activatedDealDamage: {
        runAs: 'played',
        preSettleRead: {
            activate(event, [cost, damage]) {
                const [side] = event.pos;
                if (this.tick.fight.players[side].energy[0] < cost) throw FightError.create(ErrorType.InsufficientResources, 'Not enough energy.');
                const targetPos = positions.opposing(event.pos);
                const target = this.getCard(targetPos);
                if (!target) throw FightError.create(ErrorType.InvalidPositionAccess, 'Energy Gun must attack a card.');
                this.createEvent('energySpend', {
                    side,
                    amount: cost,
                });
                this.createEvent('shoot', {
                    from: event.pos,
                    to: targetPos,
                    damage,
                });
            },
        },
    },

    conduitGainEnergy: {
        runAt: 'field',
        postSettle: {
            phase(event) {
                const [side] = this.fieldPos!;
                const { turn } = this.tick.fight;
                if (turn.phase !== 'pre-turn' || turn.side !== side) return;
                // TODO: check circuit
                this.createEvent('energy', {
                    side,
                    amount: 0,
                    total: 3,
                });
            },
        },
    },
    conduitSpawner: {
        runAt: 'field',
        preSettleRead: {
            phase(event, [print]) {
                const [side] = this.fieldPos!;
                const { turn, field, opts } = this.tick.fight;
                if (event.phase !== 'post-attack' || turn.side !== side) return;
                const circuit = getCircuit(this.prints, field[side]);
                for (let lane = 0; lane < opts.lanes; lane++) {
                    if (circuit[lane] !== 'circuit') continue;
                    this.createEvent('play', {
                        card: this.initCard(print),
                        pos: [side, lane],
                    });
                }
            },
        },
    },

    vampiric: {
        runAs: 'played',
        postSettle: {
            attack(event) {
                if (event.direct) return;

                const target = this.getCardState(event.to);
                if (!target) return;
                const targetHealth = target.health;
                const healAmount = Math.min(targetHealth, event.damage!);
                this.createEvent('heal', {
                    pos: this.fieldPos!,
                    amount: healAmount,
                });
            },
        },
    },
} satisfies {
    [S in Sigil]?: SigilEffects<S>;
};

export const sigilInfos: Record<string, SigilInfo> = SIGIL_INFOS;
export const sigils: Record<string, SigilDef> = fromEntries(entries(SIGIL_INFOS).map<[Sigil, SigilDef]>(([id, info]) => [id, { ...info, ...(SIGIL_EFFECTS as Record<string, SigilEffects>)[id] }]));
