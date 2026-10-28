# Mass-Sim-Liturgy: specification

This specification describes what the project does and the rules every change
must keep. It is the reference for new work. Status and next steps are in
[`DEVELOPMENT.md`](DEVELOPMENT.md). The reasons for individual choices are in
[`GAME-DECISIONS.md`](GAME-DECISIONS.md) and [`DECISIONS.md`](DECISIONS.md).

## 1. Purpose and audience

The project is an offline, browser-based teaching aid for the Roman Rite of
the Mass (Ordinary Form, Roman Missal 3rd edition, GIRM). It is for altar
servers, Masters of Ceremonies, sacristans, readers, EMHCs, seminarians,
clergy practising, and curious lay people.

It is illustrative. It is not an approved ceremonial, and it must say so.

## 2. Hard constraints

| # | Constraint |
|---|---|
| C1 | Runs from `file://` and from GitHub Pages with no build step, server, bundler, account or network. It uses classic `<script>` tags only: no ES modules and no `fetch` of local files. Data ships as `.js` files. |
| C2 | Third-party code is vendored in `vendor/` (Three.js 0.128 and OrbitControls), and its licences are recorded in `SOURCES.md`. |
| C3 | Liturgical texts stay short and paraphrased. Full ICEL or other copyrighted texts are never reproduced, and anything illustrative is labelled as such. |
| C4 | Rubrical claims cite GIRM, Ceremonial of Bishops or similar paragraph numbers. Points no source settles are logged as "judgement call". |
| C5 | Every product decision is logged in `GAME-DECISIONS.md`, numbered `R<n>`, with the question, choice, alternatives and source. |
| C6 | All three pages keep working: `mass-animation.html`, `mass-3d.html` and `mass-game.html`. Shared scripts must not break the pages that do not use the newer features. |
| C7 | All tests pass in Node 22 with no dependencies. CI (`.github/workflows/checks.yml`) syntax-checks every script and runs every test file. |
| C8 | Sounds are synthesised with WebAudio or are small local files. No streaming. |
| C9 | The game runs on low-spec devices by default ("Detail: Auto"), with headroom for higher detail. Ultra, Realistic and Cinematic are opt-in levels for strong graphics cards; each adds one large step in graphics cost, and Auto never picks them. |
| C10 | Saved settings survive upgrades. The localStorage keys `massGameSetup`, `massGameScores` and `mass-church-layout-v1` are kept (and `massGameProgress` for the Path), and `SETUP_VERSION` is bumped when defaults change. |

## 3. Architecture

Classic scripts load in this order and share globals:

| File | Responsibility |
|---|---|
| `mass-rite.js` | Canonical baseline rite: `STEPS` (part, title, duration, posture, text, ref, movements, props, acts, smoke, say), roles, start positions, props, interpolation, `rebuildTimeline`. Plan of 1000 × 830 units. |
| `mass-rite-exposition.js` | Exposition of the Blessed Sacrament: steps for the lay-led and Priest forms, registered in `RITES`. |
| `mass-rite-baptism.js` | Baptism of children outside Mass (Priest or Deacon): steps registered in `RITES`. |
| `mass-rite-funeral.js` | Funeral liturgy outside Mass (Priest, or Deacon when no Priest is available; up to two servers): steps registered in `RITES`. |
| `mass-rite-corpus.js` | Corpus Christi procession after Mass (the Mass itself is not depicted), with optional local-custom stations and concluding Benediction/reposition; registered in `RITES`. |
| `mass-scenarios.js` | Rite registry `RITES`; `buildScenario(options)` dispatches on `options.rite` (default Mass) and for Mass reassigns duties for deacon, lector, 0–5 servers, incense and both kinds. Steps keep their original index as `key`. |
| `mass-parishes.js` | Versioned prepared-shell profiles, validation, reversible nave mapping and pure aisle routing. |
| `mass-features.js` | Church-layout editor and presets; server training cues. |
| `mass-speech.js`, `audio/` | Browser voices or pre-generated MP3s (`audio/audio-manifest.js`, `audio/index.csv`). |
| `mass-graphics.js` | Detail levels and quality settings. |
| `mass-materials.js` | Deterministic offline surface textures, physical texture sizing, cached stone/wood/metal finishes and reversible detail changes. |
| `mass-realism.js` | Ultra, Realistic and Cinematic rendering: glow, smoother curves, candlelight, light shafts, the church reflection probe and hand-written post-processing (ambient occlusion, bloom, filmic tone mapping), with fallbacks. |
| `mass-parish-editor.js`, `mass-parish-editor.css` | Maintainer preparation mode, plan/3D route preview, local profile library, draft and full-profile JSON export/import. |
| `parish-intake.js`, `parish-intake.cjs` | Parish source intake: manifest, parish spec, review queue and decision formats; bearing rule; spec-to-profile draft; offline CLI (see `docs/PARISH-INTAKE.md`). |
| `parish-review.html`, `parish-review.js`, `parish-review.css` | Offline bulk reviewer for `parishes/review-index.js`; exports decisions JSON. |
| `parishes/` | Per-parish reference data (sources, derived images, spec, manifest, review). Not loaded by the simulator. |
| `mass-3d.js` | Three.js church, figures, poses, props, cameras, playback, appearance, wall fading, nave seating. Exposes optional hooks (`gameBeforeRender`, `gamePick`, `gameTimeLimit`, `gameCameraTarget`, `gameCameraOverride`). |
| `mass-game-icons.js` | SVG icon set (`GameIcons`). |
| `mass-game-logic.js` | **Pure, Node-testable game rules**: options and presets, roles, decision derivation, choices, scoring, timers, lapses and M.C. detection, sacristan checklists, routes, media cues, search index. |
| `mass-game-audio.js` | WebAudio bells, thurible, cues and backing tracks. |
| `mass-game-view.js` | Camera pad, highlight mode, first person, speaker view. |
| `mass-game-path.js` | The Path map, list and detail panel (`PathView`), progress storage. |
| `mass-game-practice.js`, `mass-game-practice.css` | Optional Practice room controller and accessible scene markers; pure round/scoring/record rules remain in `mass-game-logic.js`. |
| `mass-game-ui.js` | Hover tips, search and index card, feedback dialog. |
| `feedback-config.js` | `FEEDBACK_ENDPOINT` (empty means offline fallback). |
| `mass-game.js` | Game controller: setup form, phases, questions, the Missal view, scene extras (sacristy, cupboard, doors). |
| `mass-menu-concepts.js`, `mass-menu-concepts.css` | Card-stack setup, involvement illustrations, challenge settings and seasonal celebration browser. Dashboard, three-step and original layouts remain available; all reuse the real form controls. |

Rule: game rules belong in `mass-game-logic.js` with tests. DOM and Three.js
code belongs in the other files. Any markup that a script looks up at
startup must appear **before** the `<script>` tags in the HTML.

## 4. Game behaviour

### 4.1 Setup

- **Setup layout**: Card stacks is the default, with grouped roles, illustrated
  involvement choices and collapsed advanced settings. Challenge & assistance
  contains decision frequency, minister lapses, Sacristan opening tasks and
  symbols; sound/camera settings are separate. A seasonal browser and grouped
  native selector expose every existing celebration. Advent and Easter-specific
  rites are labelled unavailable, not substituted with generic Mass presets.
  Special celebration switches are removed from Ministers and shown only in
  their own celebration/custom context. Changing type uses the celebration
  picker. These browsing groups and colour tints are not liturgical ranks,
  calendar restrictions or changes to vestment settings. Dashboard, step-by-step
  and original layouts remain available through Menu layout and `?menu=...`,
  retaining controls, values and storage. Version 8 keeps version 7 saves intact.
- **Presets**: Weekday Mass, Sunday Mass (four servers, no incense), Sunday
  Mass with incense (default), Solemnity, Mass with the Bishop (mitre- and
  crozier-bearers in vimps; also a "Bishop presides" option) and Confirmation Mass
  (the Bishop confirms after the Gospel; no Creed; a candidate and sponsor stand for all) and Christmas Mass during the Night (the Christmas Proclamation before Mass, all genuflect at the Incarnation, the crib in the nave blessed at the universal prayer) and Candlemas (candles blessed at the back of the church, a procession with lighted candles, no Penitential Act) and Ash Wednesday (the ashes blessed and given after the Homily, no Penitential Act, Gloria or Alleluia) and Sunday Mass with Baptism (the children received at the door, baptized at the font after the Homily, no Penitential Act or Creed) and the Funeral Mass (the body received at the door with holy water and the white pall, violet, no Penitential Act, Gloria or Creed, the final commendation with incense and the Song of Farewell instead of the blessing; not on the days when GIRM 380 forbids it). Outside Mass: Baptism of Children (Priest or Deacon, one server), the Funeral Liturgy outside Mass (Priest or Deacon, up to two servers; incense with two), Adoration
  (lay-led, no blessing), Exposition and Benediction (Priest or Deacon, in
  white cope, with the humeral veil for the blessing), and the Corpus Christi
  procession after Mass (Priest carrying the Blessed Sacrament; optional
  canopy, lights and prayer stations labelled as local custom). Editing any
  option shows "Custom". Roles a rite does not have are refused with a message.
- **Roles**:
  - Priest, Deacon and Server (book, bell and vessels)
  - Cross-bearer, Candle-bearer and Thurifer
  - Mitre-bearer and Crozier-bearer (Mass with the Bishop only)
  - Lector 1 and 2
  - Usher, EMHC, Master of Ceremonies, Sacristan and Screen operator
  - Congregation

  If the chosen options do not suit the role, the options are adjusted and
  the change is stated.
- **Involvement** (formerly "Level"; the stored value is still `level`):
  - Watch: no questions.
  - Guided: the single right answer is shown.
  - Choice: pick one of a few answers, with two tries.
  - Timed: as Choice, with a countdown that grows after timeouts.
  - Expert: click the place, the person or the passage in the book yourself.
- **Options**:
  - Ministers and readers: deacon, lector, readers 1–2, servers 0–5,
    lector processions, EMHC, collection.
  - Rites: Gloria, Creed, second reading, Penitential Act form or sprinkling,
    sung or said, Eucharistic Prayer I–IV, Solemn Blessing, gifts procession.
  - Incense and Communion: incense, both kinds, reserved hosts, Deacon
    distributes.
  - Bells: start, epiclesis and elevations, sacristy bell.
  - Other: minister lapses, open-church training, projector.
  - Corpus Christi: canopy, processional lights and prayer stations are
    independently optional local customs; insufficient server teams disable
    options that need more ministers.
- **The Path** (`mass-game-path.js`, rules in `mass-game-logic.js`): a map
  of celebrations (`CELEBRATIONS`) in order of precedence, with branches for
  Eucharistic worship outside Mass, the seasons and the Bishop, converging on
  the Triduum. On phones it is a list. Progression is soft: everything stays
  playable and the Path only recommends an order.
  - A finished game is credited to the celebration whose preset matches the
    final options (`presetForOptions`), or else to the chosen preset. Custom
    games are not credited.
  - Stars per role, best kept: 1 for completion, 2 at 70% or more, and 3 at
    90% or more in Choice, Timed or Expert. Watch and Guided earn 1 star.
    Existing stored marks retain their corresponding 1, 2 or 3 stars.
  - Seniority (`SENIORITY_RANKS`): Aspirant, Server, Senior Server, Head
    Server, Master of Ceremonies, Master of Ceremonies of the Triduum. A rank
    needs each listed celebration completed in any role or involvement,
    without a passing score. Recommendations also advance on completion.
  - Celebrations without a preset show "In preparation".
  - Progress is stored in localStorage key `massGameProgress` (versioned).
- **Church and appearance**:
  - Layout preset, nave seating, crucifix and processional-cross position,
    tabernacle position and mounting, altar size.
  - Windows, floor, vestment colour (defaults to the season of the coming
    Sunday) and server robes.
  - Parish preparation: a named profile separates church layout from the
    celebration. The initial template has a fixed rectangular shell, one
    sanctuary level and a right-hand sacristy. It supports six furniture
    groups, bounded pew-block deformation, door leaves within prepared openings,
    bounded aisle waypoints, colours and an optional simple exterior shell.
    It does not model arbitrary buildings or guarantee collision-free sanctuary
    choreography. No real parish survey or photographic assets are included.
  - Maintainers edit a working copy, preview, save a draft, export/import full
    versioned JSON, and explicitly apply locally. Cancel restores the previous
    scene. Applied profiles form a local library; selecting a different church
    retains the others. Profiles override legacy furniture/seating controls
    while selected, not the Mass rules. Church changes are blocked during an
    unfinished game. Existing saved settings are retained.
  - New storage keys: `mass-parish-profile-v1`, `mass-parish-library-v1`,
    `mass-parish-draft-v1`. File imports are limited to 64 KB and strictly
    validated before use. Stable church and object IDs and content revisions
    reserve a future reviewed-patch workflow; patch processing and online
    submission are not implemented.

### 4.2 Phases

Optional **Practice room** opens through a **Mini-games** button at the top
of every setup layout and in the simulator header, without submitting setup
or rebuilding the celebration. Playback, answer time and pending game delays
pause; closing restores the prior setup visibility, camera and playback state.
MG01 finds five visible targets in the current 3D church, with named/description
clues and picture hints. MG02 moves illustrated objects from a cupboard onto a
visual preparation board, with optional mouse dragging, pick/tap destinations,
keyboard controls, visible placements, reset and feedback from the shared
preparation rules. MG03 orders
minister groups and assigns their carried objects. MG02/MG03 support only their
four explicitly labelled ordinary Mass arrangements, not special rites or a
Bishop. Cross and candles are one shared rank. MG06 inspects six illustrated
ordinary-Mass before-entrance scenes, including two correct scenes. Its supported
set is Lectionary/ambo, Missal/chair, chalice/credence and white altar cloth;
cross and two candles are already in place, other preparation assumed ready.
Correct Book of the Gospels placement on the altar is permitted. Click an
object or a furnishing missing preparation, or choose Nothing wrong. Hints
are optional; explanations cite GIRM 117-118 and 306. This is a fixed training
illustration, not a saved parish inspection or an assessment of missed cues.
MG10 is abstract rhythm and
direction timing, not a universal incensation pattern. MG11 balances and moves
a symbolic lighter flame through three candle targets ending at the Easter
Candle, not a ritual lighting order. MG12 matches symbolic glow numbers and
timing pulses, not real ignition procedures or heat/fuel advice. No activity
instructs real fire handling or depicts injury. These three games have Standard,
Slow and untimed Assisted modes, button/keyboard controls, reset, replay,
skip-target and finish-now actions. Assistance does not cap stars; early
completion leaves unvisited targets unscored. They use the existing render
hook, no additional animation loops, timers, audio or global input listeners.
All exercises are keyboard/touch accessible, with untimed alternatives.
Finishing always counts as completion; performance
stars use 70%/90% thresholds independently. Best stars and completion counts
are stored only in versioned `massGamePractice`, never in celebration progress,
scores or setup. Closing practice returns to the same setup/resume state.

1. `setup`
2. `pre`: vest and line up, or, as Sacristan, open the church and set up from
   the cupboard.
3. `mass`: the clock stops at each of the player's duties.
4. `post`: return to the sacristy, or pack away as Sacristan.
5. `summary`: score, a log with references, and the best score saved.

### 4.3 Rules

- Every answer shows its rubric reference.
- After two wrong answers the correct answer is shown in green. Clicking it
  continues, as does the Continue button.
- **Redo previous** rolls back the last decision, including its score.
- The timeline can jump only to the player's next question.
- Speech for a step is held while a question about that step is open.
- Lapses: NPC ministers occasionally miss a duty. The Priest, Deacon or M.C.
  reminds the right person in an optional, skippable side quest.
- The role can be switched between questions, and the score is kept.
- Questions can be turned off at any time; the remaining duties are then done
  for the player and not scored.

### 4.4 Interface

- Role card with portrait, Missal view and symbols on answers.
- Hover-to-highlight answers, and hover tooltips after 650 ms.
- Search with categories and an index card.
- Camera pad, highlight mode on by default, and fading of walls that block
  the view.
- Skip button and the S key.
- Anonymous feedback button.

## 5. Acceptance checks for any change

1. `node mass-scenarios.test.cjs`, `node mass-features.test.cjs`,
   `node mass-assets.test.cjs`, `node mass-game.test.cjs` and
   `node mass-corpus.test.cjs` all pass.
2. Any new script has a `node --check` line in `checks.yml`, and any new test
   file has a run line.
3. The change has been played through in a real browser via `file://`: no
   console errors, and the new behaviour has been seen working.
4. Decisions are logged, and the README and `SOURCES.md` are updated where
   relevant.
5. CI on the pull request is green.
