[Next.JS]: https://github.com/vercel/next.js
[tRPC]: https://github.com/trpc/trpc
[Zustand]: https://github.com/pmndrs/zustand
[Prisma]: https://github.com/prisma/prisma
[Framer Motion]: https://www.framer.com/motion/
[Tone.js]: https://github.com/Tonejs/Tone.js

[Vercel]: https://vercel.com/
[Upstash]: https://upstash.com/
[Neon]: https://neon.tech/
[Pusher]: https://pusher.com/

[transient updates]: https://github.com/pmndrs/zustand#transient-updates-for-often-occurring-state-changes

# Contributing

If you're looking to contribute, first: thank you very much ^^! Read below to get a feel of the codebase, and look at some [issues](https://github.com/Vap0r1ze/inscrybe-with-friends/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc) for examples of things to help with.

## Getting Started
  1. Clone the repo
  2. Install dependencies with `pnpm i`
  3. Run the dev server with `pnpm dev`
  4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Technologies Used
  - **[Next.JS]** `both` &ndash; Backend framework built for react
  - **[tRPC]** `both` &ndash; Really nice way to make APIs with type-safety and Next.js SSR support
  - **[Zustand]** `frontend` &ndash; Really nice state management library for react (see: [transient updates])
  - **[Framer Motion]** `frontend` &ndash; Used for animating elements
  - **[Tone.js]** `frontend` &ndash; Audio library, eventually will be used for music
  - **[Prisma]** `backend` &ndash; ORM for the postgres database

## Services Used
I use the free-tier of everthing listed here
  - **[Vercel]** &ndash; Pretty good serverless hosting with great Next.JS support
  - **[Upstash]** &ndash; Redis cache with a sufficient free-tier and low latency with Vercel
  - **[Neon]** &ndash; Really cool postgres host with an interesting git-like branch system for schemas
  - **[Pusher]** &ndash; Lets you push events to your clients fast without hosting your own WebSocket server, has a builtin authentication system

## Codebase Structure
```
.
├─ components/
│  └─ client/ - All the gameplay UI
│     └─ animations/ - All the animation code
│
├─ hooks/ - Mostly stores, but also utility hooks
│  ├─ useClientStore.ts - Where client data is stored
│  └─ useGameStore.ts - *Where game host data is stored and saved locally
├─ lib/ - Code for both frontend and backend
│  ├─ defs/ - The actual card/sigil data exists
│  ├─ engine/ - All the core game logic
│  ├─ online/ - Zod schemas for engine types
│  ├─ spritesheets/ - Defines the locations of things in each spritesheet
├─ pages/ - Root components for each page
│  ├─ _app.tsx - Global wrapper component for all pages
│  ├─ _document.tsx - html <head> stuff
│  └─ 404.tsx - 404 page
├─ prisma/ - Database schema
├─ public/ - Assets
└─ server/ - Serverside code
   ├─ trpc/ - API endpoints
   ├─ redis/ - Redis scripts to do some operations in one request
   ├─ auth.ts - Discord NextAuth handler
   └─ kv.ts - Some reuseable cache methods

* Client-side game hosting current only exists in the playtest page
```

## Codebase Terms

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
