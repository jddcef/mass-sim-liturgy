# Holy Mass simulator: decision log

Recorded on 15 October 2026 while building `mass-game.html`. The user asked
for autonomous work: where a question arose, a sensible choice was made and
recorded here for later review. Every entry gives the question, the choice,
the alternatives considered and the source. "Judgement call" means no
liturgical source settles the point; such entries are the ones most worth
checking against local practice.

Liturgical sources were consulted through the Magisterium AI service
(magisterium.com), mainly the General Instruction of the Roman Missal (GIRM,
2002/2011 English translation). Paragraph numbers are cited as "GIRM n".
These are product decisions, not ecclesiastical approvals.

## Architecture

| # | Question | Choice | Alternatives considered | Source |
|---|---|---|---|---|
| A1 | Fork the rite, or reuse it? | Reuse `mass-rite.js`, `buildScenario`, the 3D church, layouts and audio. Game rules sit in `mass-game-logic.js`, which is pure and tested in Node. The controller is `mass-game.js`. | Separate game engine with its own rite data (would drift from the explorer). | Judgement call |
| A2 | How does the game control the 3D engine? | Four small, optional hooks in `mass-3d.js` (`gameBeforeRender`, `gamePick`, `gameTimeLimit`, `gameCameraTarget`). The explorer pages run unchanged when they are absent. | Copying `mass-3d.js`; a plugin/event system (too heavy for classic scripts on `file://`). | Judgement call |
| A3 | Where are the sacristy and the outside of the church? | A sacristy annex to the right of the sanctuary (plan x 1000-1220, y 40-260), reached through a door near the credence table; a narthex and doors beyond y 830. | Sacristy behind the apse (blocks the fixed cameras). | Judgement call |
| A4 | Sounds | Synthesised with WebAudio (`mass-game-audio.js`), so they work offline without new audio files. They include a small hand bell, the sacristy bell, thurible chain clinks and right/wrong/tick cues. | Recorded samples (licensing and size). | Judgement call |
| A5 | Liturgical text | The game uses the existing short, paraphrased lines. The Missal "book" view shows abbreviated excerpts and labels unused options as such. No full ICEL texts are reproduced. | Full texts (copyright). | Project rule (see DECISIONS.md) |

## Roles and options

| # | Question | Choice | Alternatives considered | Source |
|---|---|---|---|---|
| R1 | Which roles are playable? | Priest, Deacon, Server (book/bell/vessels), Cross-bearer, Candle-bearer, Thurifer, Lector, Master of Ceremonies, Sacristan and a member of the congregation. | Psalmist and gift-bearers as roles (they have only one or two moments; left as NPCs). | GIRM 93-111 |
| R2 | The chosen role does not exist in the chosen options (for example the Thurifer with incense off). | The setup adjusts the options and states each change: it adds a deacon or lector, raises the server count (Cross-bearer needs 2 or 4+, Candle-bearer 3+, Thurifer 5) and switches incense on. | Refusing to start; hiding impossible roles. | Judgement call |
| R3 | Optional elements | Incense; deacon; lector; 0-5 servers; Communion under both kinds; Gloria; Creed; second reading; Penitential Act form A or C, or the blessing and sprinkling of water; sung or said; Eucharistic Prayer I-IV; Solemn Blessing; procession with the gifts; bells at the start, epiclesis and elevations; minister lapses on or off. | Seasonal options (Easter/Lent) and Benediction were left out to keep the scope bounded. | GIRM 46-90; Missal Appendix II (sprinkling) |
| R4 | Communion under both kinds without a deacon | Switched off with a note: this simulator needs the Deacon to minister the chalice. | Extraordinary ministers as extra figures. | Existing baseline (README); GIRM 162, 284 |
| R5 | Eucharistic Prayer choice | It changes the Missal labels, the Missal ribbon on the sacristan's checklist and the references. Timing and gestures stay schematic. | Different durations per prayer. | GIRM 365 |
| R6 | Said Mass | The sung Gospel acclamation and Psalm become said, and the ministers' movements do not change. | Removing the procession (not required at a said Mass). | GIRM 40, 120 |

## Starting, moving and finding your place

| # | Question | Choice | Alternatives considered | Source |
|---|---|---|---|---|
| M1 | Where does each role start? | Ministers, the M.C. and the sacristan start in the sacristy: they vest, take what they carry and line up. The parishioner starts outside the doors, takes holy water, genuflects towards the tabernacle and chooses a pew. | Everyone starts at the back of the church. | GIRM 105, 106, 117-120; GIRM 274 (genuflection, by analogy) |
| M2 | The book server (S) does not process in the baseline. | That server waits at the servers' bench. The pre-Mass task asks "where do you wait?" rather than "go to the back". | Changing the baseline so S processes. | Judgement call (keeps `mass-rite.js` unchanged) |
| M3 | Procession order | Thurifer, cross between candles, servers, lector (with the Book of the Gospels when there is no deacon), deacon (with the Book), priest. | | GIRM 120, 172 |
| M4 | Click-to-move | Expert: click the floor, and the answer is correct within a tolerance of the expected place. Choice/Timed: choose a named place; markers on the floor can be clicked too. Guided: one "Do it" button. | Free walking at every step (the rite would stall). | Judgement call |
| M5 | Walking routes | Walks pass through the sacristy door and along the side aisle, using the explorer's route-finding. | Straight lines (would walk through pews). | Judgement call |
| M6 | The parishioner's seat | The nearest existing congregant figure is reused as "You", so you kneel, stand and go to Communion with the congregation. | A separate figure with its own posture logic. | Judgement call |
| M7 | After Mass | Ministers process out and return to the sacristy; in the sacristy each role chooses a closing task (for example a bow to the cross and a prayer). The parishioner leaves after the ministers have gone out. | Ending at the dismissal. | GIRM 90, 169, 186; custom |
| M8 | The M.C. during Mass | The M.C. walks behind the Priest in the processions and otherwise stands near the chair. | A fixed position all through Mass. | GIRM 106; Ceremonial of Bishops 34-36 (not available through the service, so judgement call) |

## Levels and scoring

| # | Question | Choice | Alternatives considered | Source |
|---|---|---|---|---|
| L1 | Levels | **Guided**: only the correct action is shown; click to do it. **Choice**: four options, two attempts. **Timed**: as Choice, with a 12-second countdown; the clock is paused while you decide. **Expert**: no hints. You click places on the floor, click ministers, find your words in your book and choose from every possible action. | A free-running clock that keeps going during a decision (felt unfair in testing). | Judgement call |
| L2 | Which duties become decisions? | "Key" duties (movements, spoken parts, carrying, incense, bells) in the order of the rite. A "detail: all" option includes every gesture. | Every step for every role. | Judgement call |
| L3 | Points | First try 100 (Expert 150). Second try 40 (Expert 60). Timed bonus up to 50 for answering early. Guided scores a quarter. Nudging the right minister scores 80; nudging the wrong one costs 20. Result grades: ≥90% exemplary, ≥75% well done, ≥50% good start, otherwise keep practising. | Penalties for every wrong guess. | Judgement call |
| L4 | Feedback | Every answer shows the correct action, the rubric reference (`ref`) and an explanation. The end-of-Mass table lists every decision. High scores are stored in the browser (`localStorage`). | | Judgement call |
| L5 | The priest's book | The Expert priest opens the Roman Missal at the current part and clicks the line to say. Pages follow the parts of the Mass. Options not chosen today (for example EP I when using EP II) are greyed but clickable, so they count as wrong. The Deacon has the Book of the Gospels; the lector has the Lectionary; the parishioner has a pew missal. | Typed answers. | GIRM 118a; judgement call |

## Lapses, prompting and the M.C.

| # | Question | Choice | Alternatives considered | Source |
|---|---|---|---|---|
| P1 | Minister lapses | NPC lapses are planned for each game: 2 in Guided, 3 in Choice/Timed, 4 in Expert. Each never falls on the player's own duty. The minister either misses the duty (stands still and looks around) or does something wrong (sits). The rite pauses until someone gives a nudge. | Random lapses at runtime (not reproducible); continuing without a pause (too easy to miss). | Judgement call |
| P2 | Who can nudge? | The Priest, the Deacon and the M.C. The prompt is explicit in Guided and Choice, vaguer in Timed and Expert ("the celebration has stalled"), and in Expert you click the minister. | Allowing servers to nudge each other. | GIRM 106 (M.C.); judgement call |
| P3 | M.C. as director | The M.C. cues the minister due to act at each key moment (cross-bearer to process, thurifer to bring incense, server to ring the bell, and so on) and catches every lapse. | A passive observer role. | GIRM 106 ("plans the liturgical actions and sees that they are carried out with decorum, order and devotion") |

## Sacristan

| # | Question | Choice | Alternatives considered | Source |
|---|---|---|---|---|
| S1 | Pre-Mass setup | The checklist depends on the options: altar cloth, candles, the cross (on the altar, or ready to process), the Book of the Gospels (to process, or on the altar), the marked Lectionary, the Missal marked for the Collect, Preface, EP and blessing, the chalice and linens, cruets (on the gift table when there is a gifts procession), a second chalice for both kinds, the aspersory for the sprinkling, the thurible and boat, the bell, vestments for each minister and the sanctuary lamp. You place each item; Expert clicks its place in the church. | A fixed list. | GIRM 105, 117-118, 120, 172, 304-308, 316, 337-339; Missal Appendix II |
| S2 | Traps | Some actions appear in the checklist but must be refused: taking consecrated hosts to the altar, putting out the sanctuary lamp, putting reserved hosts away yourself, pouring away the Precious Blood, and putting lit charcoal in the rubbish bin. Each is answered "Not needed (or not my task)". | Leaving out wrong options. | GIRM 85, 163, 182, 316; fire safety (judgement call) |
| S3 | Post-Mass pack-away | Candles out; books, vessels (already purified at Mass), linens, cruets, cross and candles, thurible (into the sand or ash bucket), aspersory, bell and gift table cleared; vestments hung up. | | GIRM 105, 163, 183, 279; judgement call for the order |
| S4 | During Mass | The sacristan sits at the back. Mass runs at 3x (adjustable), because the sacristan has few duties then. With the start bell on, the sacristan rings the sacristy bell as the procession sets out. | Making the sacristan's player watch Mass in real time. | Judgement call; bells by local custom (GIRM 150 note) |

## Sounds and bells

| # | Question | Choice | Alternatives considered | Source |
|---|---|---|---|---|
| B1 | When are bells rung? | Defaults follow the explorer: a bell shortly before the consecration (the epiclesis) and at each elevation. The bell at the start of Mass is optional and off by default. Every bell is a setup option, because customs vary. | Always ringing a start bell. | GIRM 150 ("a little before the consecration… a server may ring a small bell… according to local custom"); judgement call for the start bell |
| B2 | Bells without servers | No bell, consistent with the baseline: without servers nobody rings it. | Having the priest ring the bell (not customary). | GIRM 150 |
| B3 | Bell with incense and a small team | When the one general server is also incensing at the elevations, the bell is omitted, so one person is not given two duties at once. A five-server team has a separate thurifer and keeps the bell. | | Existing baseline (README) |
| B4 | Thurible sounds | Chain clinks at each incensation step: the procession, the altar, the Gospel, the gifts and people, and the elevations (three swings per elevation, as in practice). | | GIRM 276-277 (incensation: three swings) |
