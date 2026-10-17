# Sources and attribution

Links below were consulted or identified during development on 14 October 2026.
External pages may change; the project does not bundle a full copyrighted Missal.

## Liturgy

- [General Instruction of the Roman Missal, Vatican English publication](https://www.vatican.va/roman_curia/congregations/ccdds/documents/rc_con_ccdds_doc_20030317_ordinamento-messale_en.html).
  The page explicitly includes adaptations for the dioceses of the United States.
  It is a source to check, not a substitute for the locally approved norms.
- Baseline Order of Mass and GIRM paragraph references in `mass-rite.js` were
  initially entered from the assistant's knowledge, not checked line by line
  against a supplied printed Missal. That uncertainty is preserved in the UI.
- Latin starter responses were entered from conventional liturgical wording;
  they are partial and have not been checked as a complete approved text.
- Bow orientation and longer priest vestments were user-directed corrections.
  The simplified figure geometry is illustrative, not a vestment specification.

## Graphics

- [Three.js](https://github.com/mrdoob/three.js), version 0.128.0.
- [OrbitControls at r128](https://github.com/mrdoob/three.js/blob/r128/examples/js/controls/OrbitControls.js).
- MIT notice retained in `vendor/THREE-LICENSE.txt`.
- Surface textures in `mass-materials.js` are project-generated canvas artwork:
  periodic noise, marble veins and slab joints, stone variation and wood grain.
  The small reflection environment is also drawn locally. No photographs,
  downloaded texture packs, HDR images or additional third-party assets are
  bundled or requested. Standard uses 256-pixel textures and High uses
  512-pixel textures; Low uses the original untextured materials.
- The generic parish profile, SVG plan, route marker and simplified exterior
  shell are project-generated. No supplied parish photos, scans, measured plans
  or new third-party assets are included. Permission and attribution must be
  reviewed before incorporating future photographic or model assets.

## Static audio

- [Kokoro-82M model card](https://huggingface.co/hexgrad/Kokoro-82M):
  open-weight model; Apache-2.0 weights; supports listed languages, but no native
  Latin voice is claimed in this project.
- [Voice descriptions](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md).
- [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx):
  MIT Python wrapper; local ONNX CPU inference.
- [Model/voice export release, model-files-v1.1](https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.1):
  `kokoro-v1.0.int8.onnx` and `voices-v1.0.bin`.
- [eSpeak NG](https://github.com/espeak-ng/espeak-ng): phonemization via the
  wrapper's dependencies. Latin phonemes do not make English-trained voices a
  native or ecclesiastically accurate Latin speech model.
- [FFmpeg](https://ffmpeg.org/): locally encodes stereo/mono MP3 assets.
- Model card declares Apache-2.0; the [Apache license text](https://www.apache.org/licenses/LICENSE-2.0.txt)
  and [wrapper license](https://github.com/thewh1teagle/kokoro-onnx/blob/main/LICENSE).
  The model card also lists training-data acknowledgements, including SIWIS
  (CC BY 4.0) and Koniwa (CC BY 3.0); consult it for those upstream details.

Provider research considered cloud OpenAI/ElevenLabs resources and other TTS
options. No such service was installed or called for synthesis. A local model was
selected to avoid keys, paid requests and uploading script text.

GitHub Agent Finder returned these resources during discovery. Scores indicate
relevance only, not trust or safety; neither was installed:

| Resource | Type | URL | Relevance score |
|---|---|---|---|
| Speech (OpenAI) | AI skill | https://github.com/openai/skills/blob/main/skills/.curated/speech/SKILL.md | 80 |
| Text To Speech (ElevenLabs) | AI skill | https://github.com/elevenlabs/skills/blob/main/text-to-speech/SKILL.md | 60 |

## Decisions and export

`DECISIONS.md` distinguishes user requirements from implementation choices.
`DIRECTOR.md` describes runtime direction, and `director-script.json` is a
machine-readable export of the baseline rite, movement and prop cues.

## Holy Mass simulator game

Liturgical questions for `mass-game.html` were checked through the Magisterium
AI service (magisterium.com search and chat) against the General Instruction of
the Roman Missal. The paragraphs used include GIRM 40, 46-90 (structure and
options), 93-111 (ministries; 105 sacristan, 106 master of ceremonies), 117-123
(preparations and entrance), 141-143, 150 (bells by local custom), 155,
158-169, 172-186 (the deacon), 194-198 (the lector), 274-277 (genuflections,
bows and incensation), 279, 284-285, 304-308, 316, 337-340 (vestments) and
365, plus Roman Missal Appendix II (blessing and sprinkling of water). The
Ceremonial of Bishops 34-36 (master of ceremonies) could not be retrieved, so
the M.C. role rests on GIRM 106 and is marked as a judgement call. Each choice
is listed with its source in `GAME-DECISIONS.md`.

The detailed incensation at the start of Mass and at the offertory (taking
the thurible, incensing the crucifix from before the altar or the processional
cross where it stands, then the altar walking around it with single swings)
follows GIRM 49, 122-123 and 276-277, checked through Magisterium AI
(https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/277).

Game icons in `mass-game-icons.js` are simple line drawings made for this
project.

Game sounds are synthesised at runtime with the Web Audio API; no recorded
effect samples are included. Spoken parts use the local generated MP3 pack
described above; new reader and EMHC roles reuse matching existing recordings.

The appearance additions were checked through Magisterium AI on 15 October
2026: [GIRM 119](https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/119)
and 336 (alb and cincture),
[GIRM 339](https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/339)
(lay ministers' attire), [GIRM 346](https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/346)
(colours and optional rose), and [GIRM 308](https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/308)
(the altar cross with the figure of Christ crucified). No universal
prescription for a senior lay server's pectoral cross was found; it is
presented only as a customisable local-practice option.

The automatic vestment colour is an illustrative Sunday calendar, not a
complete diocesan or national calendar. Easter is calculated using the
Gregorian computus; Christmas, Advent, Lent, Easter and selected major Sunday
feasts are recognised. Regional feast transfers and other calendar
precedences require the manual override. These limits and all visual choices
are recorded in `GAME-DECISIONS.md`.

Round 4 was checked on 15 October 2026 against
[USCCB GIRM chapter IV](https://www.usccb.org/prayer-and-worship/the-mass/general-instruction-of-the-roman-missal/girm-chapter-4)
(136: homily at chair or ambo; 140: offerings; 144: incensing Priest then
people) and the Vatican publication linked above (82: peace, 85: hosts
consecrated at the same Mass preferred, 162-163: EMHC timing and remaining
Sacrament, 178-183: Deacon's duties). Additional references are GIRM 73,
105(c), 109, 117, 194-196 and 314-315 for collection, readers, preparation,
procession and tabernacle placement. Reader seating, a single representative
usher, movement timings and the selected parish arrangement are illustrative
choices, not universally prescribed arrangements. See Round 4 of
`GAME-DECISIONS.md` for the EMHC and reservation limits.

Role portraits are inline SVG artwork created for this project, using its
object symbols; no external portrait images or models were acquired.

Round five choices (checked through Magisterium AI): Deacon distributing
Communion ([GIRM 182](https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/182)),
homily at the ambo or chair ([GIRM 136](https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/136)),
sacred silence ([GIRM 45](https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/45))
and tabernacle placement ([GIRM 315](https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/315)).
The silence tone and the sacristan's opening routine are judgement calls.

Round six choices: the vestments on the rail and stand follow
[GIRM 336-338](https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/338)
(alb under chasuble or dalmatic). The Missal on the Priest's left of the corporal,
the vestment rail and vesting stand, the sacristy-bell moment, the cupboard models
and the first-person camera views are common practice or judgement calls. The
cupboard and vestment models are project-made simple geometry.

Round seven choices: the reserved-hosts default is a user request, noting
[GIRM 85](https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/85)'s preference for hosts consecrated at the same Mass. The
weekday preset omits the Gloria and Creed per [GIRM 53](https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/53) and
[GIRM 68](https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/68). The screen operator's tracks are synthesised in the browser
and the slides show placeholders only; no hymn texts or recordings are included.
The monstrance, projector screen and operator desk are project-made simple geometry.

Round eight choices: the entrance hymn stopping before the Sign of the Cross follows
[GIRM 47](https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/47) (the chant accompanies the procession). Search, hover tips,
wall fading, nave seating and the feedback dialog are interface choices and need no liturgical source.
