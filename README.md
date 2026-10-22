# City Stories

A browser life-sim set in a stylized low-poly Accra, Ghana: 16 neighbourhoods from Madina and Legon down to Jamestown, Osu, Labadi and Teshie on a 160×120 tile map with the Gulf of Guinea coast and Korle Lagoon. Create a character, explore an open 3D city, walk into every building, work, eat, dance, sleep, make friends and upgrade your home. Built with Next.js, React Three Fiber and Zustand. Currency is fictional Ghana cedis (GH₵).

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL, BETTER_AUTH_SECRET, ABLY_API_KEY
npm run db:migrate           # Better Auth tables + game saves
npm run dev                  # http://localhost:3000
```

## Online play
- **Accounts:** [Better Auth](https://better-auth.com) with username + password on one form (a new username creates the account). Sign-up needs an email under the hood, so the client sends a hidden `@players.city-stories.invalid` placeholder.
- **Cloud saves:** `/api/save` stores each player's life as `jsonb` in Postgres (Neon). Autosaves every 30 s, after every result and when the tab hides.
- **One shared clock:** `src/game/clock.ts` derives game time from the server clock (`/api/time`) and `BALANCE.worldEpoch`, at 1 game minute per real second for everyone. Nothing pauses or skips time: shifts, sleep and rides take real minutes.
- **Time away:** whatever you were doing (sleep, a trip, jail) finishes while you are offline; everything else is frozen. Needs do not drain and deadlines (rent, loans, court, permits) move later by the time you missed (`catchUpToWorld` in `store.ts`). A tab hidden for over 2 game hours counts as away.
- **Live presence:** Ably presence on `accra:presence`. `/api/ably-token` issues tokens limited to that channel, with the player's account id as `clientId`.

## Controls
- Tap / click the ground to walk (A* pathfinding), or use WASD / arrows
- Tap a building to walk there and go inside; press E at any door to enter or leave
- Drag to pan, wheel or pinch to zoom, 🎯 finds your character
- The 📱 phone has Jobs, Skills, Maps, Wallet, Contacts, Messages, Calendar and Music apps
- P pauses, Esc closes panels

## Life in Accra
- Getting around: walk, trotro, taxi (dropping) or order a ride; you watch your vehicle drive across the city
- Daily Sims-style tasks plus long-term life goals with cash rewards
- Places: Korle Bu Hospital, Legon University, Accra Central Police, Accra High Court, Accra Mall, Gold Coast Bank, Osu Community Church, Accra Realty, Labadi Beach, Kwame Nkrumah Memorial Park, Jamestown Lighthouse and a land plot
- Hustles (pure water, second-hand clothes, phone repairs, fish porter, tour guide) and crime (pickpocketing, alley robbery) with arrest, custody, court pleas and prison
- Sickness (malaria, flu, food poisoning, injuries), NHIS, pharmacy and hospital stays
- University degrees that raise pay in matching careers
- Dating, engagement ring, proposal, wedding and spouse household support
- Buy land and build a house in stages, buy homes outright, home upgrades (AC, paint, generator for dumsor, mosquito nets)
- Phone: WhatsApp-style chats and a group chat, MoMo transfers with E-levy, a bank account with interest, T-bills and Ghana Stock Exchange shares

- Land: six plots that appreciate daily; buy, sell, permits (or a risky “facilitation fee”), land guards (pay, bribe police, report, fight), demolition risk without a permit
- Police: bribe at arrest or at checkpoints; it can backfire
- Driving jobs: okada (no licence), ride-hailing and trotro (DVLA licence). Buy at Spintex Motors or rent daily, then drive 6-trip shifts from the Drive app

## Performance & multiplayer readiness
- Ground, fillers, trees, lamps and road markings are instanced; far destination buildings collapse to one block
- Pedestrians and traffic recycle around the camera; traffic only ever travels on road tiles
- Labels are culled by distance; resolution drops automatically when frames slow down
- `src/game/net/`: `NetAdapter` interface, `OfflineAdapter` (default) and `RealtimeAdapter` shaped for Ably presence. Remote players are interpolated (150 ms buffer), capped to the 24 nearest and drawn with lightweight characters. Presence is published at most 5×/second and only when moving
- When going online, keep money, inventory, purchases, property and rewards on a server; presence data is display-only

## Architecture
- `src/game/config.ts`: city name, currency and every balancing value
- `src/game/content.ts`: typed careers, destinations, furniture, homes, activities, NPCs, events
- `src/game/world.ts`: tile map, collision, A*
- `src/game/store.ts`, `activities.ts`, `home.ts`: simulation, fully separate from rendering
- `src/game/life.ts`: daily tasks, life goals, weekdays, ride fares
- `src/game/save.ts`: versioned, validated local saves with corrupt-save backup
- `src/components/three/*`: R3F world, home interior, walk-in building interiors, characters, traffic, day/night, projected labels
- `src/components/Phone.tsx`: iPhone-style phone UI

Multiplayer is intentionally out of scope. When added, currency, purchases, inventory and rewards must be server-authoritative; the activity resolver in `activities.ts` is the natural place to move behind an API.
