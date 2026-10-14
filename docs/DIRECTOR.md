# Director script and execution

The authoritative application data is **`mass-rite.js`**, not this document.
`director-script.json` exports its 41 baseline steps for inspection or reuse.
Regenerate the export with `node export-director.cjs` after changing that data.

## A director step

Each step has a part, title, animation duration, paraphrased rubric, references
and congregation posture. Optional fields direct the scene:

| Field | Meaning |
|---|---|
| `mv` | Per-role waypoint paths with start/end fractions of the step |
| `acts` | Gesture descriptions and active time windows |
| `props` | Object handoffs, placements and hiding events |
| `say` | Role, abbreviated caption, and time window |
| `orans` | Hands-extended windows |
| `raise` | Host/chalice elevation windows |
| `smoke`, `bell` | Optional visual signals |
| `special` | Peace or Communion procession behavior |
| `pplBow` | Congregational bow windows |

Time fractions range from 0 to 1. Coordinates reference the original 1000 x 830
floor plan. Animation duration is compressed; it is not the actual duration of
the rite. Roles are P (Priest), D (Deacon), X (cross), C1/C2 (candles), T
(incense/extra assistant), S (general server), L (Lector), Ps (Psalmist), G1/G2
(gift-bearers) and ppl (People).

## Compilation and playback

1. `mass-scenarios.js` clones the baseline and compiles staffing/option changes.
   Original step keys remain stable even when incense steps are omitted.
2. `rebuildTimeline` precomputes actor and prop starts; this permits deterministic
   seeking without replaying every previous animation.
3. `mass-3d.js` evaluates the current fraction, poses figures and places props.
4. `mass-features.js` applies sanctuary-layout transforms and derives a selected
   server's current/next duties from the compiled cues.
5. `activityView` prioritizes elevations, processions, gestures, speakers and
   moving ministers for the automatic action camera, with smooth transitions.
6. `mass-speech.js` intercepts eligible spoken cues before playback crosses them.
   Live speech or static clips hold the timeline until completion. Pause and
   seek cancel audio; no missing translation is silently replaced.

## Audio pipeline

`prepare-audio.cjs` gathers unique role/text combinations across scenarios,
cleans the English captions and includes available Latin translations.
`generate-audio.py` synthesizes them locally, deduplicates by content hash,
mixes several voices (default four, `--group-size`) for congregation clips, encodes MP3s and writes a browser-safe
JavaScript manifest plus JSON. File-based playback uses the JS manifest rather
than requiring `fetch()` access to a local JSON file.

`snapshot-audio.cjs` can publish a partial manifest of recordings already
generated. Coverage is shown in the UI; missing clips produce a status message,
not a silent live-voice fallback. The generator's final manifest supersedes the
snapshot when generation completes.

## Limits to preserve

Do not treat narrative captions as complete prayers. Do not claim layout paths
are collision-aware or regional practices are universal. Keep Latin pronunciation
warnings until recordings have been reviewed by a competent speaker. The original
2D view has no layout/scenario/audio controls; those features are 3D-only.
