# Sources and attribution

Links below were consulted or identified during development on 14 October 2026,
and the funeral sources were checked again on 21 October 2026.
External pages may change; the project does not bundle a full copyrighted Missal.

## Liturgy

- MG10-MG12 scope checked through Magisterium on 26 October 2026:
  [GIRM 277](https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/277)
  contains context-dependent incensation directions and counts, not the
  abstract left/right rhythm used by MG10. The games explicitly do not teach
  these rubrics. The Easter Candle endpoint is user-directed game progression,
  not a ritual lighting order. MG12 numbers and pulses are abstract game
  mechanics, with no real-world ignition procedure or physical units.
- Practice room MG01-MG03 sources rechecked through Magisterium on 26 October
  2026: [GIRM 118](https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/118)
  (preparation), [119](https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/119),
  [120](https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/120),
  [172](https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/172),
  [188](https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/188)
  and [194](https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/194)
  (procession and carried objects); [296](https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/296),
  [309](https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/309),
  [310](https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/310)
  and [314](https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/314)
  (church furnishings). The shared cross/candle rank reflects the rubric;
  exact spacing, the unladen server arrangement and accepting the simulator's
  alternate Missal preparation locations are explicitly schematic choices.
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
- Material under `parishes/` (when added) is reference data supplied by the
  owner. Each file's provenance and licence are recorded in its
  `manifest.json`. Street View and satellite images are reference-only and
  are not used as textures or shipped in the simulator.

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

The Corpus Christi procession was checked through Magisterium AI against
[Holy Communion and Worship of the Eucharist outside Mass, §75](https://www.magisterium.com/docs/4870a66b-080c-40ca-a547-da43942dabd8/ref/Chap%202.%202.%2075),
which leaves street decoration and procession order to local custom and allows
stations with Eucharistic Benediction where customary and pastorally useful,
and the
[Directory on Popular Piety and the Liturgy, §162](https://www.magisterium.com/docs/4fba701f-fda0-47a5-a2de-2e210d81f770/ref/162),
which says the Corpus Christi procession normally follows Mass and carries the
Host consecrated at that Mass. The rite starts at the procession's departure;
it does not depict the preceding Mass or a separate exposition. The ritual
allows prolonged public adoration following Mass as an alternative context,
but this is not made a required prelude here. The
[General Introduction, §77](https://www.magisterium.com/docs/4870a66b-080c-40ca-a547-da43942dabd8/ref/Chap%202.%202.%2077)
places lights, incense and the canopy under local custom; the
[Directory, §163](https://www.magisterium.com/docs/4fba701f-fda0-47a5-a2de-2e210d81f770/ref/163)
describes the concluding Eucharistic blessing as the end of the whole
celebration. The route and visual details are illustrative/local-custom
choices, not universal requirements. The procession order, local arrangements,
optional stations and reposition are also cross-checked against the 1973
ritual's
[Eucharistic Procession provisions, nn. 101–108](https://www.magisterium.com/docs/f4a7ad29-94a7-4462-81ff-334856815169/ref/page42).

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

Round 22 (Baptism of children) choices were checked through Magisterium AI
against the Order of Baptism of Children. The English
[Introduction](https://www.magisterium.com/docs/164c92b2-87d0-45cf-8b77-30cda6588e3a/ref/16)
gives the structure of the rite (the rite begins with the reception of the
children, whose foreheads the parents and the celebrant sign with the sign of
the cross), the
[ministries and roles](https://www.magisterium.com/docs/164c92b2-87d0-45cf-8b77-30cda6588e3a/ref/7),
the
[time and place](https://www.magisterium.com/docs/164c92b2-87d0-45cf-8b77-30cda6588e3a/ref/10)
(the parish church, which must have a baptismal font), the
[Lord's Prayer and the blessing of the parents and all present](https://www.magisterium.com/docs/164c92b2-87d0-45cf-8b77-30cda6588e3a/ref/19),
the
[Easter Vigil adaptations](https://www.magisterium.com/docs/164c92b2-87d0-45cf-8b77-30cda6588e3a/ref/28)
and the
[Sunday Mass adaptations](https://www.magisterium.com/docs/164c92b2-87d0-45cf-8b77-30cda6588e3a/ref/29)
(the reception of the children at the beginning of Mass, the greeting and
penitential rite omitted, the Credo not said because the profession of faith
takes its place, and the blessing at the end of Mass). The rite itself keeps
the Latin numbering of the *Ordo Baptismi Parvulorum*, so the project cites
the Latin text directly: the
[reception of the children and the interrogation of the parents](https://www.magisterium.com/docs/64bbbe97-21df-452c-90b3-d5aa00de2845/ref/page19)
(nos. 32-37), the
[time and place of Baptism](https://www.magisterium.com/docs/64bbbe97-21df-452c-90b3-d5aa00de2845/ref/page13)
(nos. 8-11, including the Sunday and the Easter Vigil), the
[structure of the rite](https://www.magisterium.com/docs/64bbbe97-21df-452c-90b3-d5aa00de2845/ref/page14)
(nos. 12-18), the
[water and the font](https://www.magisterium.com/docs/64bbbe97-21df-452c-90b3-d5aa00de2845/ref/page8)
(nos. 18-25), the
[baptismal register](https://www.magisterium.com/docs/64bbbe97-21df-452c-90b3-d5aa00de2845/ref/page9)
(no. 29), the
[exorcism and the anointing with the oil of catechumens](https://www.magisterium.com/docs/64bbbe97-21df-452c-90b3-d5aa00de2845/ref/page23)
(nos. 49-52), the
[address at the font and the blessing of the water](https://www.magisterium.com/docs/64bbbe97-21df-452c-90b3-d5aa00de2845/ref/page24)
(nos. 53-54) and the
[Baptism and the anointing with chrism](https://www.magisterium.com/docs/64bbbe97-21df-452c-90b3-d5aa00de2845/ref/page28)
(nos. 60-62). These sit with
[CIC 861](https://www.magisterium.com/docs/927224e3-8c2d-44ed-a9fb-dc736030081d/ref/861)
(the bishop, presbyter or deacon as ordinary minister of Baptism) and
[CIC 877](https://www.magisterium.com/docs/927224e3-8c2d-44ed-a9fb-dc736030081d/ref/877)
(the baptismal register kept by the pastor of the place of baptism). The
placement of the font, the choice of one representative parent and godparent,
and the distribution of the oils are judgement calls. Where the project writes
"OBP 29" it means the number 29 of the English Introduction (the adaptations
for Mass within Sunday Mass), not no. 29 of the Latin rite, which is the
baptismal register and is cited as such in R167.

Round 23 (Funerals) choices were checked through Magisterium AI against the
General Introduction of the Order of Christian Funerals, which gives the
[presiding minister](https://www.magisterium.com/docs/3d220e66-7234-440a-966d-169484c63632/ref/14)
(priests preside; where no priest is available deacons preside), the
[homily](https://www.magisterium.com/docs/3d220e66-7234-440a-966d-169484c63632/ref/27)
(brief, on the readings, and never a eulogy), the
[prayers of intercession](https://www.magisterium.com/docs/3d220e66-7234-440a-966d-169484c63632/ref/29),
the
[silence](https://www.magisterium.com/docs/3d220e66-7234-440a-966d-169484c63632/ref/34)
and the
[Easter candle](https://www.magisterium.com/docs/3d220e66-7234-440a-966d-169484c63632/ref/35),
the
[pall](https://www.magisterium.com/docs/3d220e66-7234-440a-966d-169484c63632/ref/38),
the
[liturgical colour](https://www.magisterium.com/docs/3d220e66-7234-440a-966d-169484c63632/ref/39),
the
[processions and the three stations](https://www.magisterium.com/docs/3d220e66-7234-440a-966d-169484c63632/ref/42)
and the
[final commendation and farewell](https://www.magisterium.com/docs/3d220e66-7234-440a-966d-169484c63632/ref/6).
The corpus holds the 2009 United States ritual only as an English General
Introduction, whose numbered records are headings rather than paragraph
numbers, so the United States paragraph numbers cited in the project come
from published outlines of the same ritual: the
[FDLC outline of the Order of Christian Funerals](https://fdlc.org/wp-content/uploads/2021/08/Outline_of_Order_of_Christian_Funerals.pdf)
(Funeral Liturgy 128-153, Funeral Mass 154-176, Funeral Liturgy outside Mass
177-203), the
[outline of the funeral liturgy outside Mass](https://www.rmhealey.com/docs/pdf/Funeral_Liturgy-Outside_Mass.pdf)
(nos. 177-203, with the reception of the body, the greeting, the sprinkling,
the pall, the entrance procession, the placing of Christian symbols, the
opening prayer, the readings, the homily, the intercessions, the Lord's
Prayer and the final commendation) and the
[Through Death to Life excerpt](https://assets.avemariapress.com/media/files/cf9ada9cdd7ea97cea8f29d68ea3aced/Through_Death_to_Life_Excerpt.pdf)
(nos. 159-164, the introductory rites of the Funeral Mass: the greeting, the
sprinkling, the pall, the entrance procession and the placing of Christian
symbols), the
[diocesan guidelines for the rite of Christian funerals](https://richmonddiocese.org/wp-content/uploads/2015/10/Guidelines-for-the-Rite-of-Christian-Funerals-2-1.pdf)
(nos. 172, 174 and 176: the silence, the Song of Farewell and the procession
to the place of committal), the
[diocesan norms for the Order of Christian Funerals](https://www.orlandodiocese.org/wp-content/uploads/2023/07/Order-of-Christian-Funerals.pdf)
(nos. 170, 170-176 and 437: the words of remembrance, the end of the liturgy
and the alternate dismissal), the
[notes on the final commendation](https://catholicsensibility.wordpress.com/2010/11/05/ocf-171-175-final-commendation/)
(nos. 171-175) and the
[notes on the procession to the place of committal](https://catholicsensibility.wordpress.com/2010/11/06/ocf-176-procession-to-the-place-of-committal/)
(no. 176, with the texts that may be sung as the procession leaves the
church). The 1969 Latin *Ordo Exsequiarum* in the corpus is
cited for what it is: the
[three types of funeral and the forbidden days](https://www.magisterium.com/docs/f7d36d03-08f8-445b-8490-f5b8c08cd00c/ref/page5)
(nos. 4-8, with no. 6 on when the funeral Mass is forbidden), the
[final commendation after the funeral Mass](https://www.magisterium.com/docs/f7d36d03-08f8-445b-8490-f5b8c08cd00c/ref/page6)
(no. 10) and the
[rite of final commendation](https://www.magisterium.com/docs/f7d36d03-08f8-445b-8490-f5b8c08cd00c/ref/page19)
(nos. 46-48, the sprinkling and incensing, the *Subvenite* and the *In manus
tuas*). The Masses for the Dead follow
[GIRM 372](https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/372)
(ritual Masses are prohibited on the Sundays of Advent, Lent and Easter, on
solemnities, on All Souls' Day, on Ash Wednesday and during Holy Week),
[GIRM 374](https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/374),
[GIRM 380](https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/380)
(the Funeral Mass may be celebrated on any day except solemnities that are holy
days of obligation, Holy Thursday, the Easter Triduum, and the Sundays of
Advent, Lent and Easter),
[GIRM 381](https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/381)
and
[GIRM 384](https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/384)
(after the prayer after Communion and omitting the concluding rite, the final
commendation or farewell takes place, only if the body is present). The
[Roman Missal instruction on the Masses for the Dead](https://www.magisterium.com/docs/3f204803-62dd-4467-9edb-8b46db283e8a/ref/Masses%20for%20the%20Dead)
says the same about the days on which the Funeral Mass may be celebrated. The
Gloria and the Creed are not said at an ordinary weekday Funeral Mass, which
follows from
[GIRM 53](https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/53)
and
[GIRM 68](https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/68),
not from any paragraph of the Order of Christian Funerals. The coffin on a
bier in the nave, the single funeral director and family mourner, and the
simplification of the incensation of the coffin are judgement calls. The
Vigil and the Rite of Committal are not modelled.

Round eight choices: the entrance hymn stopping before the Sign of the Cross follows
[GIRM 47](https://www.magisterium.com/docs/db52efa7-5906-412d-b27c-ca92e0ce6c86/ref/47) (the chant accompanies the procession). Search, hover tips,
wall fading, nave seating and the feedback dialog are interface choices and need no liturgical source.
