export const enum ErrorType {
    InvalidAction = 'InvalidAction',
    InvalidCard = 'InvalidCard',
    InsufficientResources = 'InsufficientResources',
    InvalidEvent = 'InvalidEvent',
    InvalidPositionAccess = 'InvalidPositionAccess',
    MaxStackSize = 'MaxStackSize',
}
const ErrorMessages: Record<ErrorType, string> = {
    InvalidAction: 'Invalid action',
    InvalidCard: 'Invalid card',
    InsufficientResources: 'You cannot afford to play this card',

    InvalidEvent: 'An effect created an invalid event',
    InvalidPositionAccess: 'Effect tried to access an invalid position',
    MaxStackSize: 'Event stack size exceeded',
};

export const INTERNAL_ERRORS = [
    ErrorType.InvalidEvent,
    ErrorType.InvalidPositionAccess,
    ErrorType.MaxStackSize,
];

export class FightError extends Error {
    private constructor(public type: ErrorType, message: string) {
        super(message);
    }
    get name() { return this.type + 'Error'; }
    static create(type: ErrorType, message?: string): FightError {
        return new FightError(type, message ?? ErrorMessages[type]);
    };
}
