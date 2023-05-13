import type { SpriteSheet } from '@/components/sprites/Sprite';

export const AuthErrors = {
    not_verified: 'You must verify your Discord account to sign in.',
};

export const Assets = {
    CardCosts: '/assets/gbc/card_costs.png',

    CardFace: '/assets/gbc/card_empty.png',
    CardFaceRare: '/assets/gbc/rare_cards/card_empty_rare.png',

    CardBack: '/assets/gbc/cardback.png',
    CardBackSubmerged: '/assets/gbc/card_submerge.png',

    RareFrameNature: '/assets/gbc/rare_cards/rare_frame_nature.png',
    RareFrameTech: '/assets/gbc/rare_cards/rare_frame_tech.png',
    RareFrameUndead: '/assets/gbc/rare_cards/rare_frame_undead.png',
    RareFrameWizard: '/assets/gbc/rare_cards/rare_frame_wizard.png',

    SacrificeMarker: '/assets/gbc/card_sacrifice_empty.png',
    Digits: '/assets/gbc/digits.png',
    SpecialStats: '/assets/gbc/special_stat_icons.png',
    portrait: (id: string) => `/assets/gbc/portraits/${id}.png`,
    sigil: (id: string) => `/assets/gbc/sigils/${id}.png`,
};

export const SpriteSheets = {
    CardCosts: {
        path: Assets.CardCosts,
        tileSize: { width: 26, height: 15 },
        size: { width: 4, height: 10 },
        borders: { in: 1, out: 1 },
    },
    Digits: {
        path: Assets.Digits,
        tileSize: { width: 5, height: 6 },
        size: { width: 10, height: 1 },
        borders: { in: 1, out: 0 },
    },
    SpecialStats: {
        path: Assets.SpecialStats,
        tileSize: { width: 16, height: 8 },
        size: { width: 3, height: 5 },
        borders: { in: 1, out: 0 },
    },
} satisfies Record<string, SpriteSheet | ((...args: any[]) => SpriteSheet)>;
