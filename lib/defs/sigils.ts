import { ActionReq, ActionRes } from '../engine/Actions';
import { FieldPos, CardPos, initCardFromPrint, getMoxes, MoxType } from '../engine/Card';
import { EffectContext, EffectTarget, EffectTriggers } from '../engine/Effects';
import { ErrorType, FightError } from '../engine/Errors';
import { lists, positions } from '../engine/utils';
import { entries } from '../utils';
import { prints } from './prints';

export type SigilPos = [CardPos, Sigil];
export type Sigil = keyof typeof sigilsReal;
export interface SigilDef extends EffectTriggers {
    name: string;
    description: string;

    runAfter?: readonly string[];
    runAs?: EffectTarget;
    runAt?: CardPos[0];

    buffs?: (this: EffectContext, source: FieldPos, target: FieldPos) => {
        power?: number;
    } | void;
}

const sigilsReal = {
    // Act I
    airborne: {
        name: 'Airborne',
        description: 'This card will ignore opposing cards and strike an opponent directly.',

        runAs: 'played',
        writers: {
            attack(event) { event.direct = true; },
        },
    },
    antSpawner: {
        name: 'Ant Spawner',
        description: 'When this card is played, an Ant enters your hand.',

        runAs: 'attackee',
        readers: {
            attack() {
                this.createEvent('draw', {
                    side: this.side,
                    card: initCardFromPrint(prints, 'workerAnt'),
                });
            },
        },
    },
    beesWithin: {
        name: 'Bees Within',
        description: 'When this card is struck, a Bee is created in your hand.',

        runAs: 'attackee',
        readers: {
            attack() {
                this.createEvent('draw', {
                    side: this.side,
                    card: initCardFromPrint(prints, 'bee'),
                });
            },
        },
    },
    bellist: {
        name: 'Bellist',
        description: 'When this card is played, Chimes are created on adjacent empty spaces.',

        runAs: 'played',
        readers: {
            play(event) {
                this.createEvent('play', {
                    pos: [this.side, event.pos[1] - 1],
                    card: initCardFromPrint(prints, 'chime'),
                });
            },
        },
    },
    bombSpewer: {
        name: 'Bomb Spewer',
        description: 'When this card is played, fill all empty spaces with Explode Bots.',

        runAs: 'played',
        cleanup: {
            play(event) {
                for (const [side, lanes] of entries(this.tick.fight.field)) {
                    for (let lane = 0; lane < lanes.length; lane++) {
                        if (lanes[lane]) continue;
                        this.createEvent('play', {
                            pos: [side, lane],
                            card: initCardFromPrint(prints, 'explodeBot'),
                        });
                    }
                }
            },
        },
    },
    boneDigger: {
        name: 'Bone Digger',
        description: 'At the end of the owner\'s turn, this card generates 1 Bone.',

        runAt: 'field',
        cleanup: {
            phase(event) {
                if (event.phase !== 'post-attack') return;
                this.createEvent('bones', {
                    side: this.side,
                    amount: 1,
                });
            },
        },
    },
    boneless: {
        name: 'Boneless',
        description: 'When a card bearing this sigil dies, no bones are awarded.',
    },
    brittle: {
        name: 'Brittle',
        description: 'After attacking, this card perishes.',

        runAs: 'played',
        readers: {
            attack(event) {
                this.createEvent('perish', { pos: event.from, cause: 'attack' });
            },
        },
    },
    chaseAttack: {
        name: 'Burrower',
        description: 'This card will move to any empty space that is attacked by an enemy to block it.',


        runAt: 'field',
        writers: {
            attack(event) {
                if (event.direct) return;
                const targetPos = positions.opposing(event.to);
                const target = this.getCard(targetPos);
                if (target) return;

                this.prependEvent('move', {
                    from: this.fieldPos!,
                    to: targetPos,
                });
            },
        },
    },
    chaseOpposingPlay: {
        name: 'Guardian',
        description: 'When an opposing card is played opposite an empty space, this card moves to that space.',

        runAt: 'field',
        readers: {
            play(event) {
                this.createEvent('move', {
                    from: this.fieldPos!,
                    to: positions.opposing(event.pos),
                });
            },
        },
    },
    corpseEater: {
        name: 'Corpse Eater',
        description: 'If a card that you own dies by combat, this card is played from your hand on its space.',

        runAt: 'hand',
        cleanup: {
            perish(event) {
                if (event.cause === 'sac' || event.cause === 'hammer') return;
                const [side, idx] = this.handPos!;
                this.createEvent('play', {
                    pos: event.pos,
                    card: this.tick.fight.hands[side][idx],
                    fromHand: this.handPos!,
                });
            },
        },
    },
    damBuilder: {
        name: 'Dam Builder',
        description: 'When this card is played, Dams are created on adjacent empty spaces.',

        runAs: 'played',
        readers: {
            play(event) {
                this.createEvent('play', {
                    pos: [this.side, event.pos[1] - 1],
                    card: initCardFromPrint(prints, 'dam'),
                });
            },
        },
    },
    deathTouch: {
        name: 'Death Touch',
        description: 'This card instantly kills any card it damages.',

        runAs: 'played',
        readers: {
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
        name: 'Detonator',
        description: 'When this card dies, adjacent and opposing cards are dealt 10 damage.',

        runAs: 'played',
        readers: {
            perish(event) {
                if (event.cause === 'sac') return;
                const opposing = positions.opposing(event.pos);
                const [side, lane] = event.pos;
                this.createEvent('shoot', {
                    from: event.pos,
                    to: opposing,
                    damage: 5,
                });
                this.createEvent('shoot', {
                    from: event.pos,
                    to: [side, lane - 1],
                    damage: 5,
                });
                this.createEvent('shoot', {
                    from: event.pos,
                    to: [side, lane + 1],
                    damage: 5,
                });
            },
        },
    },
    doubleAttack: {
        name: 'Double Strike',
        description: 'A card bearing this sigil will strike the opposing space an extra time when attacking.',

        runAs: 'played',
        writers: {
            attack(event) {
                // FIXME
            },
        },
    },
    drawCopy: {
        name: 'Fecundity',
        description: 'When this card is played, a copy of it enters your hand.',

        runAs: 'played',
        cleanup: {
            play() {
                const card = initCardFromPrint(prints, this.card.print);
                card.state.sigils = lists.subtract(this.card.state.sigils, ['drawCopy']);
                this.createEvent('draw', {
                    side: this.side,
                    card,
                });
            },
        },
    },
    drawRabbit: {
        name: 'Rabbit Hole',
        description: 'When this card is played, a Rabbit is created in your hand.',

        runAs: 'played',
        cleanup: {
            play() {
                this.createEvent('draw', {
                    side: this.side,
                    card: initCardFromPrint(prints, 'rabbit'),
                });
            },
        },
    },
    evolve: {
        name: 'Fledgling',
        description: 'When this card is played, it gains 1 Power.',

        runAt: 'field',
        cleanup: {
            phase(event) {
                if (event.phase !== 'post-attack') return;
                // TODO: Impl default evolution, maybe a self-buff using CardState['evolved']?
                if (!this.cardPrint.evolution) return;

                let extraSigils = lists.subtract(this.card.state.sigils, this.cardPrint.sigils ?? []);
                extraSigils = lists.subtract(extraSigils, ['evolve']);
                const card = initCardFromPrint(prints, this.cardPrint.evolution);
                card.state.sigils.push(...extraSigils);

                this.createEvent('transform', {
                    pos: this.fieldPos!,
                    card,
                });
            },
        },
    },
    fourBones: {
        name: 'Bone King',
        description: 'When this card dies, 4 Bones are awarded instead of 1.',

        runAs: 'played',
        writers: {
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
        name: 'Frozen Away',
        description: 'When this card perishes, the creature inside takes its place.',

        runAs: 'played',
        readers: {
            perish(event) {
                // TODO: check if perish cause matters
                if (event.cause === 'sac') return;
                const { evolution = 'opossum' } = this.cardPrint;

                this.createEvent('transform', {
                    pos: this.fieldPos!,
                    card: initCardFromPrint(prints, evolution),
                });
            },
        },
    },
    gainBattery: {
        name: 'Battery Bearer',
        description: 'When this card is played, you gain an Energy Cell.',

        runAs: 'played',
        cleanup: {
            play() {
                this.createEvent('energy', {
                    side: this.side,
                    amount: 1,
                });
            },
        },
    },
    hoarder: {
        name: 'Hoarder',
        description: 'When this card is played, choose a card from your deck to be drawn immediately.',

        runAs: 'played',
        requests: {
            play: {
                callFor() {
                    return [this.side, {
                        type: 'chooseDraw',
                        deck: 'main',
                        choices: this.tick.host.decks[this.side].main.slice().sort((a, b) => a - b),
                    }];
                },
                async onResponse(event, res: ActionRes<'chooseDraw'>, req: ActionReq<'chooseDraw'>) {
                    if (!req.choices.includes(res.idx)) throw FightError.create(ErrorType.InvalidAction, 'Cannot draw card that is not in deck');
                    const side = event.pos[0];
                    const printId = this.tick.fight.decks[side][req.deck][res.idx];
                    const card = initCardFromPrint(prints, printId);
                    this.createEvent('draw', {
                        side,
                        card,
                        source: req.deck,
                    });
                },
            },
        },
    },
    leader: {
        name: 'Leader',
        description: 'Creatures adjacent to this card gain 1 Power.',

        buffs(source, target) {
            return {
                power: positions.isAdjacent(source, target) ? 1 : 0,
            };
        },
    },
    looter: {
        name: 'Looter',
        description: 'When this card deals damage directly, draw a card for each damage dealt.',

        runAs: 'played',
        cleanup: {
            attack(event) {
                event.damage!;
            },
        },
    },
    manyLives: {
        name: 'Many Lives',
        description: 'When this card is sacrificed, it does not perish.',

        runAs: 'played',
        writers: {
            perish(event) {
                if (event.cause === 'sac') this.cancel();
            },
        },
    },
    mightyLeap: {
        name: 'Mighty Leap',
        description: 'This card blocks opposing Airborne creatures.',

        runAfter: ['airborne'],
        runAs: 'attackee',
        writers: {
            attack(event) {
                const attacker = this.getCard(event.from)!;
                if (!attacker.state.sigils.includes('airborne')) return;

                event.direct = false;
            },
        },
    },
    sharp: {
        name: 'Sharp Quills',
        description: 'Once this card is struck, the striker is dealt 1 damage.',

        runAs: 'attackee',
        readers: {
            attack(event) {
                this.createEvent('attack', {
                    from: this.fieldPos!,
                    to: event.from,
                });
            },
        },
    },
    stinky: {
        name: 'Stinky',
        description: 'The creature opposing this card loses 1 Power.',

        buffs(source, target) {
            const targetCard = this.getCard(target);
            if (targetCard?.state.sigils.includes('stone')) return;
            return {
                power: -1,
            };
        },
    },
    stone: {
        name: 'Made of Stone',
        description: 'A card bearing this sigil is immune to the effects of Touch of Death and Stinky.',
    },
    skeletonStrafe: {
        name: 'Skeleton Crew',
        description: 'At the end of the owner\'s turn, this card moves in the sigil\'s direction and plays a Skeleton in the space behind it.',

        runAt: 'field',
        cleanup: {
            phase(event) {
                if (event.phase !== 'post-attack') return;
                sigilsReal.strafe.cleanup.phase.call(this, event);
                this.createEvent('play', {
                    pos: this.fieldPos!,
                    card: initCardFromPrint(prints, 'skeleton'),
                });
            },
        },
    },
    squirrelStrafe: {
        name: 'Squirrel Shedder',
        description: 'At the end of the owner\'s turn, this card moves in the sigil\'s direction and plays a Squirrel in the space behind it.',

        runAt: 'field',
        cleanup: {
            phase(event) {
                if (event.phase !== 'post-attack') return;
                sigilsReal.strafe.cleanup.phase.call(this, event);
                this.createEvent('play', {
                    pos: this.fieldPos!,
                    card: initCardFromPrint(prints, 'squirrel'),
                });
            },
        },
    },
    strafe: {
        name: 'Strafe',
        description: 'At the end of the owner\'s turn, this card moves in the sigil\'s direction.',

        runAt: 'field',
        cleanup: {
            phase(event) {
                if (event.phase !== 'post-attack') return;
                const [side, lane] = this.fieldPos!;
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
        name: 'Hefty',
        description: 'At the end of the owner\'s turn, this and adjacent cards move in the sigil\'s direction.',

        runAt: 'field',
        cleanup: {
            phase(event) {
                if (event.phase !== 'post-attack') return;
                const [side, lane] = this.fieldPos!;
                // TODO do push check etc
                this.createEvent('move', {
                    from: this.fieldPos!,
                    to: [side, lane + (this.card.state.backward ? -1 : 1)],
                });
            },
        },
    },
    threeSacs: {
        name: 'Worthy Sacrifice',
        description: 'This card counts as 3 Blood rather than 1 Blood when sacrificed.',
    },
    tristrike: {
        name: 'Trifurcated Strike',
        description: 'This card will deal damage to the opposing spaces left, right, and opposite of it.',

        runAs: 'played',
        writers: {
            triggerAttack(event) {
                this.cancelDefault();
                const [side, lane] = positions.opposing(event.pos);
                this.createEvent('attack', { from: event.pos, to: [side, lane - 1] });
                this.createEvent('attack', { from: event.pos, to: [side, lane] });
                this.createEvent('attack', { from: event.pos, to: [side, lane + 1] });
            },
        },
    },
    bistrike: {
        name: 'Bifurcated Strike',
        description: 'This card will strike each opposing space to the left and right of the spaces across it.',

        runAs: 'played',
        writers: {
            triggerAttack(event) {
                this.cancelDefault();
                const [side, lane] = positions.opposing(event.pos);
                this.createEvent('attack', { from: event.pos, to: [side, lane - 1] });
                this.createEvent('attack', { from: event.pos, to: [side, lane + 1] });
            },
        },
    },
    unkillable: {
        name: 'Unkillable',
        description: 'When this card perishes, a copy of it enters your hand.',

        runAs: 'played',
        readers: {
            perish() {
                // TODO: find out if double-death check is necessary
                this.createEvent('draw', {
                    side: this.side,
                    card: this.card,
                });
            },
        },
    },
    voidDamage: {
        name: 'Repulsive',
        description: 'If a creature would attack this card, it does not.',

        runAs: 'attackee',
        writers: {
            attack() { this.cancel(); },
        },
    },
    waterborne: {
        name: 'Waterborne',
        description: 'On the opponent\'s turn, creatures attacking this card\'s space attack directly.',

        runAt: 'field',
        cleanup: {
            phase(event) {
                if (event.phase !== 'pre-turn') return;
                const isRowTurn = this.tick.fight.turn.side === this.side;
                const shouldFlip = +isRowTurn ^ +!this.card.state.flipped;
                if (shouldFlip) this.createEvent('flip', { pos: this.fieldPos! });
            },
        },
    },
    waterborneTentacle: {
        name: 'Kraken Waterborne',
        description: 'Same as Waterborne, except that this card becomes a Tentacle card when it emerges.',

        runAt: 'field',
        cleanup: {
            phase(event) {
                if (event.phase !== 'pre-turn') return;
                sigilsReal.waterborne.cleanup.phase.call(this, event);
                // TODO implement
            },
        },
    },

    // GBC
    doubleDeath: {
        name: 'Double Death',
        description: 'When another creature you own dies, it dies again.',

        runAs: 'played',
        readers: {
            perish(event) {
                if (event.cause === 'transient') return;

                this.createEvent('play', {
                    pos: event.pos,
                    card: this.card,
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
    sentry: {
        name: 'Sentry',
        description: 'When a card moves into the space opposing this card, they are dealt 1 damage.',

        runAs: 'opposing',
        cleanup: {
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

    // Act III
    sniper: {
        name: 'Sniper',
        description: 'You may choose which opposing spaces this card strikes.',

        runAs: 'played',
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

    // Mox
    buffGems: {
        name: 'Gem Animator',
        description: 'Mox cards on the owner\'s side of the board gain 1 Power.',

        buffs(source, target) {
            const { print } = this.getCardInfo(target)!;
            if (print.traits?.includes('mox')) return { power: 1 };
        },
    },
    dropRubyOnDeath: {
        name: 'Ruby Heart',
        description: 'When this card perishes, a Ruby Mox replaces it.',

        runAs: 'played',
        cleanup: {
            perish() {
                this.createEvent('play', {
                    pos: this.fieldPos!,
                    card: initCardFromPrint(prints, 'moxO'),
                });
            },
        },
    },
    gainGemAll: {
        name: 'Great Mox',
        description: 'While this card is on the board, it provides all 3 Gems to its owner.',
    },
    gainGemGreen: {
        name: 'Green Mox',
        description: 'While this card is on the board, it provides a Green Gem.',
    },
    gainGemOrange: {
        name: 'Orange Mox',
        description: 'While this card is on the board, it provides an Orange Gem.',
    },
    gainGemBlue: {
        name: 'Blue Mox',
        description: 'While this card is on the board, it provides a Blue Gem.',
    },
    gemsDraw: {
        name: 'Mental Gymnastics',
        description: 'When this card is played, you draw cards equal to the amount of your Mox cards played.',

        runAs: 'played',
        cleanup: {
            play() {
                const [side] = this.fieldPos!;
                const moxCount = this.tick.fight.field[side].filter((pos) => {
                    return pos?.print && prints[pos.print].traits?.includes('mox');
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
        name: 'Gem Dependant',
        description: 'If this card\'s owner controls no Mox cards, this card perishes.',

        runAt: 'field',
        cleanup: {
            play() {
                const [side] = this.fieldPos!;
                const moxCount = this.tick.fight.field[side].filter((pos) => {
                    return pos?.print && prints[pos.print].traits?.includes('mox');
                }).length;
                if (moxCount > 0) return;
                this.createEvent('perish', {
                    pos: this.fieldPos!,
                    cause: 'attack',
                });
            },
            phase() {
                if (this.tick.fight.turn.phase !== 'pre-turn' && this.tick.fight.turn.phase !== 'post-attack') return;
                sigilsReal.gemDependant.cleanup.play.call(this);
            },
        },
    },

    // Buttons
    activatedStatsUp: {
        name: 'Enlarge',
        description: '[Activate]: Pay 2 [Bones] to increase the [Power] and [Health] of this card by 1.',

        runAs: 'played',
        readers: {
            activate(event) {
                const [side] = event.pos;
                if (this.tick.fight.players[side].bones < 2) throw FightError.create(ErrorType.InsufficientResources, 'Not enough bones.');
                this.createEvent('bones', {
                    side,
                    amount: -2,
                });
                this.createEvent('stats', {
                    pos: event.pos,
                    power: this.getPower(event.pos)! + 1,
                    health: this.card.state.health + 1,
                });
            },
        },
    },
    activatedStatsUpEnergy: {
        name: 'Stimulate',
        description: '[Activate]: Pay 3 [Energy] to increase the [Power] and [Health] of this card by 1.',

        runAs: 'played',
        readers: {
            activate(event) {
                const [side] = event.pos;
                if (this.tick.fight.players[side].energy[0] < 3) throw FightError.create(ErrorType.InsufficientResources, 'Not enough energy.');
                this.createEvent('energySpend', {
                    side,
                    amount: 2,
                });
                this.createEvent('stats', {
                    pos: event.pos,
                    power: this.getPower(event.pos)! + 1,
                    health: this.card.state.health + 1,
                });
            },
        },
    },
    activatedEnergyToBones: {
        name: 'Bonehorn',
        description: '[Activate]: Pay 1 [Energy] to gain 1 [Bone].',

        runAs: 'played',
        readers: {
            activate(event) {
                const [side] = event.pos;
                if (this.tick.fight.players[side].energy[0] < 1) throw FightError.create(ErrorType.InsufficientResources, 'Not enough energy.');
                this.createEvent('energySpend', {
                    side,
                    amount: 1,
                });
                this.createEvent('bones', {
                    side,
                    amount: 1,
                });
            },
        },
    },
    activatedDiceRollEnergy: {
        name: 'Power Dice',
        description: '[Activate]: Pay 1 [Energy] to set the [Power] of this card randomly between 1 and 6.',

        runAs: 'played',
        readers: {
            activate(event) {
                const [side] = event.pos;
                if (this.tick.fight.players[side].energy[0] < 1) throw FightError.create(ErrorType.InsufficientResources, 'Not enough energy.');
                this.createEvent('energySpend', {
                    side,
                    amount: 1,
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
        name: 'Disentomb',
        description: '[Activate]: Pay 1 [Energy] to create a [Skeleton] in your hand.',

        runAs: 'played',
        readers: {
            activate(event) {
                const [side] = event.pos;
                if (this.tick.fight.players[side].energy[0] < 1) throw FightError.create(ErrorType.InsufficientResources, 'Not enough energy.');
                this.createEvent('energySpend', {
                    side,
                    amount: 1,
                });
                this.createEvent('draw', {
                    side,
                    card: initCardFromPrint(prints, 'skeleton'),
                });
            },
        },
    },
    activatedSacrificeDraw: {
        name: 'True Scholar',
        description: '[Activate]: If you have a Blue gem, destroy this card to draw 3 cards.',

        runAs: 'played',
        readers: {
            activate(event) {
                const [side] = event.pos;
                if (!(getMoxes(this.tick.fight.field[side]) & MoxType.Blue))
                    throw FightError.create(ErrorType.InsufficientResources, 'Requires a blue gem.');

                this.createEvent('perish', {
                    pos: event.pos,
                    cause: 'attack',
                });
                for (let i = 0; i < 3; i++) {
                    this.createEvent('draw', {
                        side,
                        source: 'main',
                    });
                }
            },
        },
    },
    activatedDealDamage: {
        name: 'Energy Gun',
        description: '[Activate]: Pay 1 [Energy] to deal 1 damage to the space across from this card.',

        runAs: 'played',
        readers: {
            activate(event) {
                const [side] = event.pos;
                if (this.tick.fight.players[side].energy[0] < 1) throw FightError.create(ErrorType.InsufficientResources, 'Not enough energy.');
                const targetPos = positions.opposing(event.pos);
                const target = this.getCard(targetPos);
                if (!target) throw FightError.create(ErrorType.InvalidPositionAccess, 'Energy Gun must attack a card.');
                this.createEvent('energySpend', {
                    side,
                    amount: 1,
                });
                this.createEvent('shoot', {
                    from: event.pos,
                    to: targetPos,
                    damage: 1,
                });
            },
        },
    },


    // Custom
    vampiric: {
        name: 'Vampiric',
        description: 'When this card attacks another, it heals for the amount of damage dealt.',

        runAs: 'played',
        cleanup: {
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
} satisfies Record<string, SigilDef>;
export const sigils: Record<string, SigilDef> = sigilsReal;
