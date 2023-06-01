# Inscrybe With Friends

## Codebase Terms

If you're looking to contribute, first: thank you very much ^^!

To make things *hopefully* easier for you, here's a breakdown of terms I use around the codebase.

- `Fight` - A battle, keeps track of basic rules (hammer limits, lives, etc), which cards are on field/in hand, player score, who's turn it is, etc.
- `Side` - At the moment, either `player` or `opposing`[^1]
- `Turn` / `Phase` - At any given moment of a `Fight` it is one of the `Side`'s turn
- `Event` - Represents any action that mutates a `Fight`
- `Effect` - Something that reacts to an `Event`, either by mutating/canceling it or creating new events
- **"settling" an event** - Calling all the effects of an event, and then taking the finalized event and applying it's mutations to a `Fight`
- `Action` - Any type of routine user-input from the `Side` of the current turn.
- `Request` + `Response` - An event may call for immediate user input of either `Side`, for example: the [Bomb Latch] sigil may ask it's owner where to place [Detonator], in which case all game logic is halted until it receives a `Response`.
- `FightPacket` - Represents a summary of fight progress resulting from an `Action` or `Response`. Eg: every `Event` after your `bellRing` action: starting with the `phase: [player, pre-attack]` event, and ending with `phase: [opponent, draw]` Event.

- `Host` - The `Host` is where the Fight logic is ran, usually server-side unless its a local game.
- `Client` - The client keeps track of it's own `Fight` instance, and updates it every `FightPacket`
- `Adapter` - In charge of retrieving anything that may be externally stored: the player's decks, their shuffle order, etc.
- `Tick` - A short-lived wrapper around a `Fight`, keeps track of which `Event`s are **settled** and which still need to be **settled**. When a `Request` is raised, this will also store a `backlog` of `Event`s that still need to be **settled** *after* the respective `Response` is received

[^1]: yes, server-side, one of the players is the canonically the antagonist
