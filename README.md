# Mass-Sim-Liturgy

Learn the Roman Rite of the Mass by taking part in it. Choose a role, such as
Priest, altar server, Master of Ceremonies or Sacristan. Then walk through a
whole Mass in a 3D church, answering what you should do or say next.

## Play now

**[▶ Play the Holy Mass simulator](https://jddcef.github.io/mass-sim-liturgy/mass-game.html)**

It runs in any modern browser on a computer or tablet. There is nothing to install
and no account. Other pages:

- [3D Mass explorer](https://jddcef.github.io/mass-sim-liturgy/mass-3d.html):
  watch the Mass from any angle, with server training cues.
- [Floor-plan animation](https://jddcef.github.io/mass-sim-liturgy/mass-animation.html):
  the original 2D overview.

### How to start

1. Pick a **kind of celebration**: Weekday Mass, Sunday Mass, Sunday Mass with
   incense, Solemnity, Mass with the Bishop, Confirmation Mass, Christmas Mass during the Night, Candlemas, Ash Wednesday, Sunday Mass with Baptism, Funeral Mass, Palm Sunday, Holy Thursday (Evening Mass of the Lord's Supper), Good Friday (Celebration of the Passion of the Lord), or outside Mass: Baptism of
   Children (Priest or Deacon), the Funeral Liturgy (Priest or Deacon), Adoration led by a lay minister, Exposition and Benediction with the Priest or the Deacon, or the Corpus Christi procession. It follows Mass; the Mass itself is not depicted. The Priest carries the Blessed Sacrament along an outdoor route and concludes with Benediction and reposition. Canopy, lights, route incense and prayer stations are optional local customs. You can also
   change any option
   yourself.
2. Pick a **role** and your **involvement**:
   - **Watch**: no questions.
   - **Guided**: click to go along.
   - **Choice**: pick from a few answers.
   - **Timed**: as Choice, with a countdown.
   - **Expert**: find the place and the words yourself.
3. Press **Start**. Drag to look around and scroll to zoom. Use the search box
   to find any person or object.
4. Use the **Questions** button to turn questions off and just watch, and the
   🔊 button for sound.
5. Open **✠ The Path** for a suggested order of celebrations, from a weekday
   Mass towards the Easter Triduum. Completing the milestone celebrations in
   any role or involvement raises your **seniority**, with no passing score:
   Aspirant, Server, Senior
   Server, Head Server, Master of Ceremonies and finally Master of Ceremonies of
   the Triduum. Everything stays playable in any order. Celebrations marked
   *In preparation* are planned but not in the game yet.

The Corpus Christi scene is illustrative. The route follows local direction;
canopy, lights, incense on the route and prayer stations are not presented as
universal requirements.

Found a mistake or have an idea? Use the **💬 Feedback** button in the game.
It is anonymous.

For richer surfaces, use **Detail: Standard** or **High**. Under **The church**,
choose **Sanctuary floor: Pale marble** for veined stone slabs, or sandstone,
terracotta or slate. Wooden furnishings show grain and metal vessels have a
soft sheen. All textures are generated locally, so they work offline.
**Low** keeps flat finishes for slower devices; **Auto** chooses Low or Standard.

This is an illustrative teaching aid, not a substitute for the approved Missal,
ceremonial training or local custom. Prayer texts are short paraphrases.

## For developers

Everything runs from local files (`file://`) with no build step or server. To
work on it offline, clone the repository and open `mass-game.html`.

- [`docs/SPEC.md`](docs/SPEC.md): what the project does and must keep doing.
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md): the resume checklist, project
  status and workflow for new contributors and AI sessions.
- [`docs/MINI-GAMES.md`](docs/MINI-GAMES.md): persistent mini-game ideas and
  implementation statuses.
- [`docs/GAME-DECISIONS.md`](docs/GAME-DECISIONS.md) and
  [`docs/DECISIONS.md`](docs/DECISIONS.md): the decision logs.
- [`docs/SOURCES.md`](docs/SOURCES.md): sources and licences.
- [`docs/DIRECTOR.md`](docs/DIRECTOR.md): the director's notes.
  `docs/director-script.json` preserves the complete baseline animation script.

## 3D explorer
Open **mass-3d.html** in a modern browser for the interactive 3D version.
Everything is local; no server, installation, account or internet connection is
needed. Keep the JavaScript, stylesheet and `vendor` folder beside the HTML.
WebGL must be enabled in the browser.

Drag the scene to orbit, right-drag to pan and scroll to zoom. The camera menu
provides church, altar, ambo, chair, congregation and overhead views, plus
minister-follow views. Clicking a minister also follows them. Reset view restores
the chosen camera. On touchscreens, use one finger to orbit and two to pan/zoom.
**Follow the action** automatically tracks active gestures, speakers and moving
ministers, frames the altar during elevations, and uses wider shots for the
processions and Communion. Transitions are smoothed; choose a fixed view when
you want full manual camera control.

Use Play, Previous, Next, the timeline or the Order of Mass list to navigate.
Space toggles playback and the arrow keys change steps when no form control has
focus. Scenario changes pause playback and restart the current step.

The setup controls change both the figures and their duties:

- Without a deacon, the priest proclaims the Gospel, raises both vessels,
  purifies the vessels and dismisses the people.
- Without servers, the priest or deacon prepares the altar, the cross and
  candles remain in place, and incense and bells are omitted.
- Choose 0-5 servers. One handles the book, vessels and water; two adds a
  cross-bearer; three uses a pair of candle-bearers instead of a cross-bearer;
  four includes both cross and candles; five adds a separate incense server
  (or an additional assistant when incense is off). For teams below five,
  the general server also handles incense. The bell is omitted during
  incensed elevations so one person is not given simultaneous duties.
  This is an illustrative allocation, not a prescribed staffing rule.
- Without a lay reader/psalmist, the priest proclaims the readings and leads
  the Psalm.
- Incense can be omitted independently when servers are present.
- Communion under both kinds is optional; this illustration requires a deacon
  to minister the chalice. Otherwise the priest distributes the Host alone.

**mass-animation.html** retains the original animated floor-plan view. Both
versions share the rite and movement data in `mass-rite.js`; the 3D version
applies its scenario adaptations in `mass-scenarios.js`.

This is an illustrative Sunday Mass in Ordinary Time, not a substitute for an
approved Missal or ceremonial training. Rubrics are paraphrased, timings and
gestures are schematic, and speech uses excerpts rather than a complete Missal. The original paragraph
references require verification against the approved Missal and local norms.
Postures, options and Communion practice vary with the applicable norms.

The offline renderer uses Three.js 0.128.0 and its OrbitControls, distributed
under the MIT license in `vendor/THREE-LICENSE.txt`.

To check the scenario duties, timelines and sampled motion states, run
`node mass-scenarios.test.cjs` from this folder.

## Server training

Enable **Train with one server**, then choose a member of the configured team.
The camera follows that server and shows current and next duties. **Jump to next
duty** pauses playback and takes you to the next movement, gesture or object
handoff. Cues use the scenario's combined duties, including the omission of the
bell when the same person is incensing the elevation. A zero-server setup
disables training. Training cues are illustrative, not a complete checklist.

## Editable church layout

The original controls below are the **Legacy layout**. For portable, named
profiles, use **Parish preparation** in the explorer or the game's **Engine
settings**, or **Prepare a parish** on the game setup sheet.

Choose the altar, ambo, celebrant/deacon chairs, credence table, servers' bench
or tabernacle. Edit **X** (left-right, 100-900) and **Depth** (back-front, 35-260),
then apply. Related nearby destinations, vessels, labels and cameras follow the
furniture. Positions are restricted to the sanctuary; at least 100 layout units
of centre clearance from the altar are required for other furniture.
Movement paths are schematically deformed, not collision-aware route planning.
The church shell, pews and nave remain fixed. Rotation and floor-height editing
are not included.

Choose a preset and apply it for a central/left ambo, mirrored/right ambo,
compact chapel, broad sanctuary with side chair, or central tabernacle with
side chair arrangement. These are illustrative furniture configurations in the
same church shell, not measured architectural plans.

Layouts are saved in this browser's local storage, subject to browser permission
and file-URL storage behavior. Export/import a JSON file for a portable copy.
**Default layout** restores the original arrangement without changing the
original floor-plan animation.

### Preparing parish profiles

The first maintainer editor supports a **prepared rectangular church shell**,
one sanctuary level and a right-hand sacristy. It is a starting template, not
a measured recreation of any real church. Irregular plans, changing the shell
dimensions, new openings, furniture rotation, different floor levels and
extended outdoor routes need additional prepared geometry and navigation work.

1. Open **Prepare a parish** before starting a game. Give the church a name
   and a stable lowercase ID, such as `st-example`. Keep the ID when revising
   the same church and increase its revision when publishing an update.
2. Select furniture, a door or an aisle waypoint on the plan or in the list.
   Edit its numeric coordinates. Furniture and its nearby standing places,
   interaction targets, vessels, labels and cameras move together. Door leaves
   can move only within the template's prepared openings.
3. Adjust the pew block boundaries and seating style. The row count is fixed;
   pews, seated people and nave movement coordinates change together. Waypoint
   coordinates refer to the original plan; their transformed positions appear
   on the preview. There are 40 reference-plan units per metre.
4. Use the blue **Route preview** and **Preview in 3D**. The latter temporarily
   applies the draft and shows a moving route marker in the scene. Nave routing
   avoids pew blocks except for leaving/entering a row. The checks do **not**
   prove every sanctuary movement, furniture clearance or scenario is safe.
   **Show exterior shell** adds simple fading walls and a pitched roof.
5. **Save working copy** stores one draft in this browser without applying it.
   **Apply locally** adds or updates the named profile in the local library
   and selects it. **Cancel** restores the church and camera used before
   editing; explicitly saved drafts remain available. **Reset draft to
   published** resets the working copy only, using the generic template when
   no published profile has that ID.
6. **Export full profile** downloads validated JSON for backup or manual
   review. **Import full profile JSON** accepts files up to 64 KB into the
   draft only; invalid files leave the current draft and church unchanged.
   Imports are data, never executable scripts.

The church selector keeps the published generic template, the Legacy layout,
and up to 50 locally applied church profiles. Switching churches does not delete
other local profiles. Layout selection is separate from celebration presets.
While a profile is active its furniture and seating override the legacy layout
and tabernacle/seating appearance controls; other appearance choices still
apply. Legacy settings are retained when switching back. Church changes are
blocked during an unfinished game.

Browser storage is only a convenience, particularly under `file://`; export
files for portable copies. The separate storage keys are
`mass-parish-profile-v1`, `mass-parish-library-v1` and `mass-parish-draft-v1`.
Existing layout, setup, score and Path keys are unchanged. There is no upload,
account or automatic publication. A maintainer reviews exported JSON and
incorporates approved data into the bundled classic-script profiles.

**Later user contributions:** profiles already have stable church/object IDs,
schema versions and revisions. A future patch format can record changed fields
against a specific base revision with expected old values, so conflicts are
reviewed instead of silently overwriting newer work. Patch export, patch import
and online submission are **not implemented**. For now, send a full profile
manually; new photos or models are separate attachments.

### What to collect for a real parish

Start with one pilot church: an annotated floor sketch, entrance-to-sanctuary
and reverse views, corner views, sanctuary/sacristy coverage and exterior views.
Mark doors, pew blocks, aisles, steps, furniture and actual minister routes.
Measure overall and sanctuary dimensions, aisle and door widths, step heights
and altar size; mark guesses as estimates. Add close views of the few features
that make the church recognisable.

Original-resolution photos are sufficient initially. Most are modelling
references, not textures. Perspective/colour correction, privacy removal,
texture preparation and any model simplification happen outside the editor.
Confirm rights to distributed photographs and directly reproduced artwork,
and avoid identifiable people and private notices. No photos or measured plans
are bundled with the generic template.

### Preparing many parishes from existing material

If you already have estimate cards, satellite images, Street View captures
and interior photos, an agent can sort them by following
[docs/PARISH-INTAKE.md](docs/PARISH-INTAKE.md). It builds one folder per parish
under `parishes/` with a source manifest and a parish spec, with values such
as dimensions, roof pitch, materials, belfry and fixture positions. It
excludes or flags doubtful images, for example Street View taken from the
wrong side of the street, and drafts a training layout. You then check every
doubtful item in **`parish-review.html`**, which opens directly from the
folder. Press A to accept, R to reject and S to skip, or press Ctrl+Enter to
accept with a comment. Then export the decisions and give the file back to the
agent (`node parish-intake.cjs apply <file>`).

## Speech and languages

Enable **Speak during playback** and choose voices independently for the Priest,
Deacon, Lector, Psalmist and People. Only voices reported as local by your
browser are offered; no external text-to-speech service is used. Installed voice
availability differs between browsers and systems. The People voice is a single
synthesized speaker, not a choir. Test the Priest's voice before playback.

The timeline waits for each spoken cue to finish. Pause, seek, scenario changes
and language changes cancel the current utterance; resuming may restart the
current excerpt. Speech speed is separate from animation speed. Stage directions
and chant labels are skipped; printed sung words are spoken rather than chanted.
English speaks the existing abbreviated script. Latin is a partial pack of
traditional responses, not a translation of the full script or a change of rite.
Missing translations are explicitly indicated in captions and not spoken in
English as a fallback. Most systems do not have a Latin voice: you can explicitly
select another installed voice, but its Latin pronunciation may be unsuitable.

Export a language template, replace its name, id, language tag and translations,
then import it. Supply wording you are entitled to use and verify it against the
approved liturgical text. The UI and training/rubric explanations stay in English.
An imported pack uses this structure:

```json
{
  "version": 1,
  "id": "la-parish",
  "name": "Parish Latin",
  "lang": "la",
  "texts": {
    "The Lord be with you.": "Dominus vobiscum.",
    "And with your spirit.": "Et cum spiritu tuo."
  }
}
```

Keys match the original English caption exactly. Empty translations are omitted.
Packs are saved locally when storage is available. Export templates from relevant
scenarios if you need wording from different staffing arrangements.

Run `node mass-features.test.cjs` to check layout transforms, training cues,
language validation and speech scheduling with a simulated speech engine.

## Pre-generated AI audio

Choose **Pre-generated AI recordings** as the audio source. These MP3 files play
offline without installed system voices or API credentials. Individual characters
have fixed synthetic voices. Congregation responses mix several distinct voices
(four by default for new generation; the first published clips used six),
small timing/speed differences, stereo placement and restrained echoes; they are
not a recording of a real congregation and do not simulate singing.
Use **Test congregation** to preview a response.

The static pack covers the abbreviated English script and a partial Latin pack.
Latin uses Latin phonemes with English-trained voices and is explicitly
**experimental**. Review pronunciation before using it for training.
The UI reports current audio coverage; missing clips are skipped with a status
message, rather than silently switching to live synthesis.

Generation can be resumed: completed clips are skipped. Large model files and
the generation environment are excluded from Git. Playback needs only the
`audio` assets and manifest.

Clips have readable names, grouped by language and sorted in Mass order:
`audio/en/05-people-and-with-your-spirit-40b93bf5.mp3` is step 5 (first use),
spoken by the people. The final 8 characters are a fingerprint of the exact
wording, so a changed text gets a new file. `audio/index.csv` lists every
planned clip with its steps, step title, English source text, spoken text and
whether it has been recorded; it opens in a spreadsheet and is a convenient
starting point for translation work.

To generate or complete the pack:

1. Install Python 3.10+ and FFmpeg, then install `audio-requirements.txt` in an
   isolated virtual environment.
2. Download `kokoro-v1.0.int8.onnx` and `voices-v1.0.bin` from the official
   [model-files-v1.1 release](https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.1).
3. Run `node prepare-audio.cjs audio/audio-jobs.json`.
4. Run `python generate-audio.py --model <model-path> --voices <voices-path> --jobs audio/audio-jobs.json --experimental-latin`.
   Omit the Latin flag for English-only generation. Add `--group-size N` (2-6)
   to change the number of congregation voices; delete existing `ppl` clips if
   they should be regenerated at the new size.
5. Run `node snapshot-audio.cjs` to write the manifest and `audio/index.csv`
   from the clips that exist, including while generation is still running.
   It also renames clips from the earlier hash-only naming scheme.

Use an environment outside this repository for model downloads and Python
dependencies. See `docs/SOURCES.md` for upstream licenses and attribution.

## Holy Mass simulator game

Open **mass-game.html** (also straight from the folder) to play through a Mass
in a role. The decisions made while building it are logged for review in
[`docs/GAME-DECISIONS.md`](docs/GAME-DECISIONS.md).

1. **Choose a role**: Priest, Deacon, Server (book, bell and vessels),
   Cross-bearer, Candle-bearer, Thurifer, Mitre-bearer or Crozier-bearer (when
   the Bishop presides), first or second Lector, collection
   Usher, extraordinary minister of Holy Communion (EMHC), Master of
   Ceremonies, Sacristan or a member of the congregation. Each has an
   illustrated role card.
2. **Choose your involvement**:
   - **Watch**: no questions at all. Every duty is done for you, so you can
     simply follow the Mass from your role. No score is kept.
   - **Guided**: only the right action is shown; click it and you are moved along.
   - **Choice**: pick the right action, words or place from a few options (two tries).
   - **Timed**: as Choice, with action-dependent countdowns and a bonus for quick
     answers. A timeout adds five seconds to later questions, up to 30 extra
     seconds for the run.
   - **Expert**: no hints. Click where to go on the church floor, click the
     minister you mean, and find your words in your book (the Priest's Missal,
     the Deacon's Book of the Gospels, the Lectionary or a pew missal).
3. **Choose the celebration**: incense, deacon, lector, 0-5 servers, Communion
   under both kinds, Gloria, Creed, second reading, Penitential Act form or the
   sprinkling rite, sung or said, Eucharistic Prayer I-IV, Solemn Blessing,
   gifts procession, collection, one or two readers, optional lector processions,
   EMHC assistance, additional reserved hosts, bells (start, epiclesis,
   elevations) and minister lapses. Sacristy bell, start bell, collection and reserved hosts from the tabernacle
   are on by default; lector processions and EMHC are off.
   If your role needs something (for example the thurifer needs incense), the
   setup adds it and says so. You can also place the **crucifix** (on the wall
   behind the altar, in a recessed apse, on the back wall to the left or right,
   in a recessed side chapel, or none) and the **processional cross stand**
   (either side of the altar, or at the back of the sanctuary). When no crucifix
   is on or near the altar, the Priest incenses the processional cross where it
   stands (GIRM 122, 277).

Both the game and the 3D explorer have **appearance options**: servers' robe
and cincture colours (white by default), no cincture if preferred, and an
optional pectoral cross on the senior/general server. This cross is a local
custom option, not a universal prescription. Priest and Deacon vestments
default to the coming Sunday's season (today when it is Sunday), with a manual
colour override. The simplified calendar includes Gaudete/Laetare rose,
which is optional, and some major Sunday feasts; override it for local
calendars. The main crucifix has a corpus by default. Sanctuary windows can
be stained glass (default), fine leaded grids or plain glass; the floor defaults
to warm sandstone, with terracotta, slate and pale marble alternatives. The
gold tabernacle defaults to a separate plinth behind the altar; choose left,
right or a custom position. Applying a layout preserves it as custom.

You begin in the sacristy (ministers, M.C., sacristan) or outside the doors
(congregation): vest, take what you carry, line up, or take holy water and find
a pew. Nonprocessing readers, the usher and EMHC prepare at ordinary pew places.
During Mass the clock stops at each of your duties. Number keys pick
options; click markers or the floor to move. Every answer shows the rubric
reference. After Mass you return to the sacristy (or leave), and a summary lists
every decision with its reference and your score; best scores are kept in the
browser.

After two wrong answers, either click the **green correct answer** or press
**Continue**. During Mass, **Redo previous** returns to the last completed
decision and rolls back its score and log (and any in-progress answer).
Repeated clicks go back further. The key-moments setting includes both the
gesture and the spoken words alongside movements, so walking to the chair
does not replace the Sign of the Cross before the Greeting.

The **Questions** button in the header turns questions off at any time (and
back on): the current and later duties are done for you and are not scored.
With **Symbols** on (game options), each answer, checklist item and log line
carries a small icon for the object it is about, and hovering over (or tabbing
to) an answer shows a pulsing ring in the church on the thing, place or
minister it refers to. Congregation members and servers vary in height, and
some of the congregation are children.

Use the **timeline** to move forward to your next unanswered question, once
the current question is finished; it does not award points or bypass questions.
Choose animation speed with the selector or adjacent slider. The Priest may
preach at either the chair or ambo. Reminder questions also name the duty due.
Readers and Psalmist sit with the people; everyone stands through the final
blessing and exit procession. The longer sign-of-peace interval shows exchanges
between neighbours.

The usher collects offerings and, when a gifts procession is selected, joins it
with the collection basket. The bread and wine go to the altar; the collection
is placed at a suitable place away from it (GIRM 73, 140). After the
Priest incenses the gifts, cross and altar, the Deacon (or server) incenses the
Priest, then the people. Optional EMHC assistance assumes proper deputation
and genuine need, starts after the Priest's Communion, and does not include
purification. Reserved hosts are fetched from the tabernacle and reposed by default (an
option); GIRM 85 prefers hosts consecrated at the same Mass.

- **Priest / Deacon**: other ministers occasionally miss a duty or do the wrong
  thing; the celebration stalls until you nudge the right person.
- **Master of Ceremonies**: direct the whole celebration, cueing each minister
  at their moment and catching every lapse.
- **Sacristan**: set out everything the chosen options need before Mass, refuse
  the trap tasks, then pack away afterwards. Mass runs faster in between.

Existing **generated audio** for spoken parts plays by default. The sound button
mutes speech and effects; the setup checkbox can disable recordings separately.
The second reader shares the Lector's recorded voice, and the EMHC shares the
recorded Communion formula. Missing clips are reported in the speech controls.
Effects (altar bell, sacristy bell, thurible chains, right/wrong cues) are
synthesised in the browser (bells are modelled from real bell partials with a little church reverb). For visual clarity and accessibility (including when sound is muted), active altar bells, sacristy bells and thurible swings trigger a transient HUD chime badge with expanding ripples, paired with horizontal golden wave rings across the 3D sanctuary floor. Everything plays offline. Bell customs vary by place,
so each bell is optional.

On a phone, the top menu folds into a ☰ button, and the camera controls fold into 🎥 and ✥ buttons in the corners of the 3D view. Tap anywhere else to fold them away again.

### Views, controls and training modes

- **Your role** is shown on a fixed card in the sidebar and in the question
  header, with its portrait.
- **Camera pad** (bottom right): zoom, pan and rotate. **Highlight** greys the
  church except the people and objects currently moving. **Speaker view** briefly
  switches to your character's eyes while your role speaks; drag the scene or use
  the camera pad to look around.
- **First person** (game option): walk through your own eyes. If you head the
  wrong way for a few seconds, an arrow and a ring show where to go. As Priest,
  click the Missal in front of you, then the right passage on the page. Choose
  the view with the **👁** camera-pad button, the **V** key or the "First-person
  view" option: over the shoulder (default), through the eyes, or high behind.
  People standing in the way fade out, and the camera rises over your head
  rather than passing through a wall. Outside first person, 👁 and V cycle the
  fixed cameras.
- **Skip** (the small button, or the **S** key) ends the current speech or action.
- **Side quests**: when another minister misses a duty, a blue, dashed
  "Side quest" box asks who to remind and what to do. It is optional, so
  **Skip** costs no points.
- **Sacristan training** ("Open the church", on by default): arrive outside,
  unlock the sacristy door, enter, open the main doors from inside, then carry
  each item from the cupboard to its place. Hints appear after a delay that
  depends on the level. During pack-away the camera moves to each item asked
  about, and the item is highlighted. The cupboard holds small models of each
  item (greyed out if today's options don't need it). The vestments hang on a
  rail. The Sacristan lays them out on the vesting stand, and puts them back
  afterwards. The camera follows the Sacristan while carrying.
- **Setup screen**: options are grouped (Ministers, Rites, Bells, Church,
  Vestments, Game) with an icon on each. The sacristy bell rings as the
  procession lines up.
- New options: Deacon distributes Communion (on when there is a Deacon), homily
  at the ambo (default) or chair, altar size, and tabernacle mounting (against
  the wall by default; recessed, on a ledge or on a pillar). Short fixed texts
  are fully voiced; quiet prayers sound softer; a soft tone marks the silences
  after the homily and after Communion.
- **Presets**: "Weekday Mass" (no Gloria or Creed, no servers, said),
  "Sunday Mass" (four servers, no incense), "Sunday Mass with incense"
  (default, five servers with a thurifer), "Solemnity" or "Mass with the
  Bishop" (the Bishop presides with mitre and pastoral staff, held by two
  servers in vimps; the homily from the cathedra; the pontifical blessing) or
  "Confirmation Mass" (after the Gospel the candidates are presented, renew
  their baptismal promises and are anointed with chrism by the Bishop; no Creed)
  or "Christmas Mass during the Night" (the cantor sings the Christmas
  Proclamation before Mass, all genuflect at "and by the Holy Spirit was
  incarnate", and the crib in the nave is blessed at the universal prayer)
  or "Candlemas" (the candles are blessed at the back of the church and all
  walk in procession with lighted candles while the Canticle of Simeon is
  sung; there is no Penitential Act) or "Ash Wednesday" (after the Homily
  the Priest blesses the ashes and the faithful come forward to receive them;
  no Penitential Act, Gloria or Alleluia) or "Sunday Mass with Baptism" (the
  children are received at the door; after the Homily all go to the font for
  the Baptism, chrism, white garment and lighted candle; no Penitential Act or
  Creed) or "Funeral Mass" (the body is received at the door with holy water
  and the white pall; violet, no Gloria or Creed; the final commendation with
  incense and the Song of Farewell ends Mass) or "Palm Sunday" (the palms are
  blessed at the back of the church and all enter in procession with branches;
  the Passion is read in parts at the ambo without candles or incense, all
  kneel at the death of the Lord; no Penitential Act or Gloria) or "Holy
  Thursday" (the Evening Mass of the Lord's Supper: bells at the Gloria then
  silence, the washing of feet, the Creed is omitted, and the altar is stripped
  in silence) or "Good Friday" (the Celebration of the Passion of the Lord: the
  prostration in silence, the Passion of St John, the Solemn Intercessions and
  the Adoration of the Holy Cross; no Gloria, no candles and no incense at the
  altar). Outside Mass, "Baptism of
  Children" is led by the Priest or the Deacon with one server, and the
  "Funeral Liturgy outside Mass" by the Priest or the Deacon with up to two
  servers.
  Changing any option shows "Custom".
- **The Path and seniority**: a map of celebrations in order of precedence
  (on phones, a list). Each finished game is credited to the celebration whose
  preset matches the final options. Completion in any involvement counts towards
  seniority, regardless of score. Stars show performance separately: 1 for
  completion, 2 at 70% or more, and 3 at 90% or more in Choice, Timed or Expert.
  Watch and Guided earn 1 star. The best stars per celebration and role are kept;
  existing saved completions still count. Custom games are not credited.
  Progress is kept in this browser only.
- **Liturgical Breviary & Season Ribbon**: a bookmark ribbon tab in the header
  displays today's liturgical colour and feast title. Clicking it opens a
  Breviary sheet detailing the day's precedence rank, Latin vestment colour
  (*Ruber*, *Albus*, *Viridis*, *Violaceus*, *Rosaceus*, *Aureus*) with GIRM 346
  rationales, complete Ordo Missae rubric table, and special actions.
- **Screen operator** (optional role, adds a projector and screen): a warning
  bar fills before each part, then you have a few seconds to start the
  backing track, show the slide, or leave it a cappella. Tracks are simple
  synthesised chords and slides show placeholders, not real lyrics.
- **Switch role**: use the menu on the role card between questions to carry
  on as a different minister.
- **New game** can be cancelled (button or **Esc**) to return to the game.
  The 🔊 button mutes all sound. **Detail** (Auto, Low, Standard, High) suits
  low-spec devices: Standard has local surface textures, High has sharper
  textures and shadows, and Low disables textures and shadows. Switching
  detail updates finishes immediately; antialiasing still needs a reload.
  The start bell (on by default) rings once the procession
  has gathered at the entrance. Reserved hosts are used and reposed by
  default. The cupboard also holds a monstrance for a future Exposition scenario.

- **Search** (the box in the header): type to find a person, object or place,
  or click the box to browse categories (Roles, Sacred vessels, Books,
  Processional items, Gifts, Linens, Furniture and places), each with
  **More** for the full list. Hover a result to fly the camera there and
  highlight it; click it to pin an index card saying what that role does
  next, or when the object or place is next needed. **Esc** closes it.
- **Hover** over a person or object for about half a second to see what it is.
- **Nave seating** (Church options): with side aisles (default) or benches
  running to the side walls with only a centre aisle.
- Walls between the camera and what it is looking at fade out, so you can
  still see in when the camera is pulled back behind a wall.
- **💬 Feedback** sends an anonymous note (no name or e-mail). To receive
  notes online, create a free form at a service such as
  [Formspree](https://formspree.io) and paste its endpoint URL into
  `feedback-config.js` (`FEEDBACK_ENDPOINT`). Until then the note is copied
  to the clipboard and offered as a text file to send by hand.
## Repository checks

```text
node mass-scenarios.test.cjs
node mass-features.test.cjs
node mass-assets.test.cjs
node mass-game.test.cjs
```

GitHub Actions runs these checks on pushes and pull requests. After editing
baseline direction data, run `node export-director.cjs` and commit the updated
director export. No full liturgical text, account credentials or AI model weights
are included in this repository.
