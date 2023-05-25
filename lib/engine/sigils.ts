import { ActionReq, ActionRes } from './Actions';
import { FieldPos, CardPos } from './Card';
import { EffectContext, EffectTarget, EffectTriggers } from './Effects';
import { ErrorType, createError } from './Errors';
import { positions } from './utils';

export type SigilPos = [CardPos, string];
export interface SigilDef extends EffectTriggers {
    name: string;
    description: string;

    runAfter?: readonly string[];
    runAs?: EffectTarget;

    buffs?: (this: EffectContext, source: FieldPos, target: FieldPos) => {
        power: number;
    };
}

export const sigils: Record<string, SigilDef> = {
    // Act I
    leader: {
        name: 'Leader',
        description: 'Creatures adjacent to this card gain 1 Power.',

        buffs(source, target) {
            return {
                power: positions.isAdjacent(source, target) ? 1 : 0,
            };
        },
    },
    hoarder: {
        name: 'Hoarder',
        description: 'When this card is played, choose a card from your deck to be drawn immediately.',

        requests: {
            play: {
                callFor(event) {
                    return [event.pos[0], {
                        type: 'chooseDraw',
                        deck: 'main',
                        choices: this.ctx.fight.decks[event.pos[0]].main.slice().sort((a, b) => a - b),
                    }];
                },
                async onResponse(event, res: ActionRes<'chooseDraw'>, req: ActionReq<'chooseDraw'>) {
                    if (!req.choices.includes(res.idx)) throw createError(ErrorType.InvalidAction, 'Cannot draw card that is not in deck');
                    const side = event.pos[0];
                    const [card] = await this.ctx.adapter.getCardsFromDeck.call(this.ctx, side, req.deck, [res.idx]);
                    this.createEvent('draw', {
                        side,
                        card,
                        source: req.deck,
                    });
                },
            },
        }
    },

    // GBC
    airborne: {
        name: 'Airborne',
        description: 'This card will ignore opposing cards and strike an opponent directly.',

        writers: {
            attack(event) { event.to = 'direct'; }
        }
    },
    corpseEater: {
        name: 'Corpse Eater',
        description: 'If a card that you own dies by combat, this card is played from your hand on its space.',
        runAs: 'global',

        cleanup: {
            perish(event) {
                if (!this.handPos) return;
                const [side, idx] = this.handPos;
                this.createEvent('play', {
                    pos: event.pos,
                    card: this.ctx.fight.hands[side][idx],
                    fromHand: this.handPos!,
                });
            },
        },
    },
    doubleDeath: {
        name: 'Double Death',
        description: 'When another creature you own dies, it dies again.',

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
            }
        },
    },
    manyLives: {
        name: 'Many Lives',
        description: 'When this card is sacrificed, it does not perish.',

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

                event.to = this.fieldPos!;
            }
        }
    },
    sentry: {
        name: 'Sentry',
        description: 'When a card moves into the space opposing this card, they are dealt 1 damage.',

        runAs: 'opposing',
        readers: {
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
        }
    },
    tristrike: {
        name: 'Tristrike',
        description: 'Attacks three times.',

        writers: {
            triggerAttack(event) {
                this.cancelDefault();
                const [side, lane] = positions.opposing(event.pos);
                this.createEvent('attack', { from: event.pos, to: [side, lane - 1] });
                this.createEvent('attack', { from: event.pos, to: [side, lane] });
                this.createEvent('attack', { from: event.pos, to: [side, lane + 1] });
            }
        }
    },

    // Act III
    sniper: {
        name: 'Sniper',
        description: 'You may choose which opposing spaces this card strikes.',

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
                }
            }
        }
    },

    // Custom
    vampiric: {
        name: 'Vampiric',
        description: 'When this card attacks another, it heals for the amount of damage dealt.',

        readers: {
            attack(event) {
                if (event.to === 'direct') return;

                const targetHealth = this.getCardState(event.to)!.health;
                const targetPower = this.getPower(event.from)!;
                const healAmount = Math.min(targetHealth, targetPower);
                this.createEvent('heal', {
                    pos: this.fieldPos!,
                    amount: healAmount,
                });
            },
        }
    },
};
