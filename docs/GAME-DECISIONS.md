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

## Round 2 (watching, symbols, heights, incensation, cross placement)

Added on 15 October 2026 at the user's request. Sources were again checked
through Magisterium AI: GIRM 122 (the processional cross placed near the altar
serves as the altar cross), GIRM 123 and GIRM 277 (a cross on or near the altar
is incensed before the altar is; otherwise when the Priest passes before it;
the altar is incensed with single swings while walking around it).

| # | Question | Choice | Alternatives considered | Source |
|---|---|---|---|---|
| R1 | How do you "just watch"? | A **Watch** level (first in the list) plus a **Questions on/off** header button usable mid-game. With questions off, each duty is answered correctly for you after a short pause, shown in the log as "▶", and not scored. Watch has no lapses and no score or high-score entry. | A separate "movie" page (the explorer already is one); skipping the player's duties altogether (would break walking and props). | Judgement call |
| R2 | What does hovering an answer highlight? | A pulsing cyan ring and faint beam in the church on what the answer refers to: the floor marker point, the minister, the prop (chalice, Missal, thurible, cross...) or the named place (credence, ambo, tabernacle...). The link comes from word rules in `mass-game-icons.js`; answers with no physical referent (spoken words, postures) show nothing. Works with keyboard focus too. | Highlighting by changing object colours (unclear on dark vestments); drawing lines from the panel (cluttered). | Judgement call |
| R3 | Symbols | About 40 simple line icons drawn for the project (bell, thurible, chalice, ciborium, host, cruets, book, Lectionary, Gospels, candle, cross, crucifix, altar, ambo, tabernacle, credence, vestments, postures, speech, people...). Shown beside answers, checklist items, the log and the summary; a setup checkbox turns them off. | Emoji (inconsistent across systems, few liturgical objects); an icon font (extra asset). | Judgement call |
| R4 | Heights | Congregation members range from 0.72-0.86 of the base figure height; every sixth is a child (0.50-0.58). Servers differ: cross-bearer 1.0, book server 0.95, thurifer 0.92, candle-bearers 0.84/0.86 (younger servers usually carry candles). Deterministic, so views are repeatable. | Random heights per load (screenshots would differ). | Judgement call |
| R5 | Thurible handover | The thurifer presents thurible and boat; the Priest puts in incense and blesses it, then takes the thurible; he hands it back after incensing. | The Deacon handing it over (only when a Deacon assists, GIRM 175 by analogy; kept simple). | GIRM 123, 277; judgement call on hand-off detail |
| R6 | Where is the cross incensed from? | A crucifix on the wall behind the altar or in a recessed apse counts as "near the altar": the Priest stops in front of the altar, bows, incenses it with three double swings, bows again. A crucifix elsewhere (left or right wall, side chapel) or no crucifix: the **processional cross** at its stand serves as the altar cross and is incensed there. | Incensing a distant wall crucifix "when passing before it" (GIRM 277 allows this, but the Priest does not pass it in this church). | GIRM 122, 277; judgement call on what counts as "near" |
| R7 | Walking around the altar | Single swings while walking around the altar, starting from the corner nearest where the cross was incensed, clockwise, finishing near the thurifer's waiting place. | Counter-clockwise; incensing only the front (only when the altar is against a wall). | GIRM 277; judgement call on direction |
| R8 | Offertory | The same cross rule applies when the Priest incenses the gifts, the cross and the altar; the Deacon (or a server) then incenses the Priest and the people. A wall crucifix is incensed from behind the altar ([500,106] on the plan). | | GIRM 75, 144, 178, 277 |
| R9 | Crucifix and stand placement options | Crucifix: wall behind altar (default), recessed apse, back wall left/right, recessed side chapel left, none. Stand: beside the altar right (default) or left, or back of the sanctuary right/left. The cross-bearer's routes, the sacristan's "cross on its stand" task and the "before the cross" place all follow the choice. Available in the explorer and the game. | Free drag-and-drop placement (the layout editor could gain this later). | GIRM 117, 122, 308; judgement call |
| R10 | Bug found while testing | Lapses were still planned at Watch level (`LAPSE_COUNTS.watch` was 0 but `||3` turned it into 3). Fixed and covered by a test. | | Testing |

## Round 3 (outfits, retrying, opening words and sanctuary appearance)

Added on 15 October 2026. Vestments and colours were checked through
Magisterium AI against GIRM 119, 336, 339 and 346; the corpus follows GIRM 308.

| # | Question | Choice | Alternatives considered | Source |
|---|---|---|---|---|
| R11 | Why did the Sign of the Cross seem skipped? | The rite already had the correct order, but the key-moments filter kept the walk to the chair and hid the accompanying action and words. It now keeps all moves and postures plus one gesture and one spoken line per step. The priest makes the Sign of the Cross and says its words before the Greeting, even after a wrong movement answer. | Only restoring the gesture (would still hide the words); requiring the all-duties setting. | Order of Mass 1-2; GIRM 50, 124; testing |
| R12 | What happens after both attempts are wrong? | Keep the Continue button, but also enable the green correct option: clicking it continues without changing the failed result into a scored success. | Requiring Continue; awarding points for clicking the revealed answer. | Judgement call |
| R13 | How far back can the player go? | During Mass, Redo previous returns to the last completed decision/cue/lapse, restores its pre-answer score and log, discards any in-progress answer, closes the book and restarts at that moment. It works in Watch too; repeated use goes further back. Pre-Mass and post-Mass task sequences are not rewound. | Replaying a whole rite step (may contain several decisions); retaining previous points (would duplicate scores). | Judgement call |
| R14 | Default server clothing? | All servers have white robes and white cinctures. Robes may be white, cream, red, black or blue; cinctures may be white, red, blue, green, gold, black or absent. These are visual customisation choices, not recommendations for every parish. | Fixed white robes; a separate editor for every server. | GIRM 119, 336, 339; judgement call for the palette |
| R15 | Which server wears a pectoral cross? | The general/book server (S) represents the senior server and has a small gold cross by default, with an on/off option. No cross is added to the other servers. | None by default; assigning seniority to the cross-bearer. | User-requested local custom; GIRM 339 does not prescribe a pectoral cross for lay servers |
| R16 | Automatic priest/deacon colour? | Default to the Sunday on or after the browser's local date. Gregorian Easter determines Lent/Easter; Advent and Christmas use their seasonal bounds. Selected Sunday celebrations (Palm Sunday, Pentecost, Trinity, Corpus Christi, Christ the King, All Saints) override the seasonal colour. Gaudete/Laetare use optional rose. The displayed date/colour and manual override make the assumption visible. | A full national/diocesan calendar; a fixed green default; requesting location first. | GIRM 346; judgement call |
| R17 | Calendar limits? | This is a simplified Sunday calendar, not a liturgical calendar authority. Christmas uses the Sunday on or after 7 January as its Sunday boundary; Corpus Christi is assumed transferred to Sunday. Other local feasts, transfers and precedences must be set manually. Rose can be overridden with violet. | Regional calendar selection and precedence rules (outside this appearance enhancement). | Judgement call; Magisterium notes that Baptism is Monday when transferred Epiphany falls on 7 or 8 January, which does not alter the next Sunday's colour here |
| R18 | Main crucifix body? | Show a schematic corpus with head, outstretched arms, torso, loincloth and legs by default. A bare-cross option is available for visual comparison; it is not presented as the altar-cross norm. | Keeping the former small abstract figure; a detailed external model. | GIRM 308; judgement call on geometry |
| R19 | Sanctuary windows? | Default to a fine 4-column, 9-row leaded grid, with 3-column, 7-row stained glass and plain glass alternatives. Remove the old four-pane cross-shaped dividers. | Only stained glass; external texture images. | User request; judgement call |
| R20 | Sanctuary floor? | Warm sandstone by default, with terracotta, slate and pale marble options. | Keeping the near-white floor; arbitrary colour picker. | User request; judgement call |
| R21 | Where can appearance be changed? | The same controls are in the game setup and 3D explorer. Game selections persist with the other setup choices in browser storage. Changing colours assigns cached materials without mutating materials shared by unrelated objects. | Game-only controls; separate appearance settings store. | Judgement call |
