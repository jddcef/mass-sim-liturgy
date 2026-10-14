# Decisions and provenance

Recorded from the user's requests in the development session on 14 October
2026. These are product decisions, not ecclesiastical approvals.

| Request / decision | Source | Implemented surface |
|---|---|---|
| Animate the celebration mainly from Roman Missal rubrics | Initial user request | `mass-rite.js`, original floor-plan animation |
| Paraphrase rubrics; show an illustrative Sunday in Ordinary Time | Initial implementation choice | 41 baseline director steps; no complete translated Missal |
| 3D scene, selectable views, no-deacon/no-server scenarios | User, approximately 21:25 +02:00 | `mass-3d.js`, `mass-scenarios.js` |
| 0-5 servers, combining duties for smaller teams | User selected the recommended option after the 22:27 request | Team allocations in `buildScenario` |
| Altar reverences should face towards the altar; longer chasuble | User correction during server-count work | Altar-relative orientation and priest geometry |
| Camera follows wherever activity is happening | User request during that work | `activityView`, smoothed action camera |
| Server-training mode and editable church layout | User, 22:37 | `mass-features.js`, follow-server and next-duty cues |
| Optional speech, distinct character voices, different languages | User, 22:39 | `mass-speech.js` |
| English and Latin first; additional languages importable later | User's explicit answer | English script excerpts, partial Latin pack, JSON imports |
| Static, pre-generated voices; congregation should sound like a group | User, 22:56 | Audio-source selector, MP3 playback, layered congregation |
| Use AI/free or cheap TTS; one-off generation is acceptable | User's explicit answer | Local Kokoro ONNX generator; no paid API calls or text uploads |
| Common layout presets | User during audio generation | Central, mirrored, compact, broad, axial sanctuary arrangements |
| Private `roman-mass-explorer` repository | User selected private repository in the follow-up | GitHub progress snapshot |

## Implementation choices and limits

- Browser-first, no build system: HTML, classic JavaScript, local vendor scripts
  and file-relative assets let both versions open without a web server.
- The original 2D animation remains available and shares canonical rite data with
  3D. Scenario compilation clones baseline data before applying adaptations.
- Small server teams combine practical duties; incense and ringing the bell at
  the elevation are not assigned simultaneously to the same person. This is
  a teaching simplification, not a staffing rule from the Missal.
- Communion under both kinds uses a deacon in this simulation. This is an app
  constraint, not a claim that the rite always requires a deacon for that option.
- Furniture presets only change the sanctuary arrangement within a fixed church
  shell. They are not measured plans of real churches. Nearby destinations are
  deformed with the furniture; there is no collision-avoidance solver.
- The action camera prioritizes concrete gestures, then speakers/movements.
  Elevations and processions have explicit framing overrides.
- Speech waits for each cue and skips stage directions or absent translations.
  Imported language packs do not translate the rubric UI.
- Live browser speech uses only voices marked local. The static pack uses
  four character voices and a six-voice stereo mix for the congregation, with
  slight timing/speed differences and two quiet echoes.
- Kokoro has no native Latin model here. Latin phonemization with English-trained
  voices is explicitly marked experimental; pronunciation has not been certified.
- AI speech is synthesized, not a recording of clergy or a congregation. No
  person-specific voice cloning was requested or used.
- The generator normalizes ONNX input dtypes because `kokoro-onnx` 0.4.9 types
  speed as an integer for this export. Generation uses speed 1, then applies
  modest resampling locally. Four inference threads avoid CPU oversubscription.
- Temporary Python environments and AI model/voice downloads live outside the
  repository. Only scripts, dependency requirements, generated recordings,
  manifests and documentation belong in the progress snapshot.

## Verification status

Automated checks cover staffing combinations, sampled positions/prop owners,
layout transformations, training cues and language/speech scheduling. Browser
checks exercised the original and 3D views, imported packs, saved layouts,
camera targets, live speech and cancellation.

This does **not** constitute independent verification of every Missal paragraph,
approval of the translations, human listening review of every generated clip,
or collision-free validation of every editable arrangement.
