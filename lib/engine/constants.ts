export const enum MoxType {
    Green = 1 << 0,
    Orange = 1 << 1,
    Blue = 1 << 2,
};
export const MOX_TYPES: Record<string, MoxType> = {
    Green: MoxType.Green,
    Orange: MoxType.Orange,
    Blue: MoxType.Blue,
};

export type SigilParamType = 'print' | 'number';

export type SigilParam<T extends SigilParamType> =
    T extends 'print' ? string :
        T extends 'number' ? number :
            never;
