# Mini-game ideas and implementation status

Persistent backlog for optional practice games within the simulator. These are
ideas, not implemented features or approved ceremonial instructions. Update
this list as work progresses; keep stable IDs when renaming an idea.

## Status key

- **Idea**: recorded, not yet selected for implementation.
- **Planned**: scope agreed, implementation not started.
- **In progress**: being implemented; link the issue or pull request.
- **Done**: playable, verified and merged; link the pull request.
- **Deferred**: retained for later, with the reason recorded.

Existing questions, routes, objects and animations can be reused, but do not
make a standalone mini-game Done.

## Ideas

| ID | Mini-game | Status | Gameplay and replay variations | Delivery reference |
|---|---|---|---|---|
| MG01 | Know your church | Done | Find a named vessel, book, furnishing or place in the 3D scene. Beginner hints show a picture; Expert clues describe the target. Vary targets and church layouts. First release: five visible targets per round, named or description clues, picture hints and accessible numbered scene markers. | [PR #27](https://github.com/jddcef/mass-sim-liturgy/pull/27), merged |
| MG02 | Sacristy scramble | Done; visual upgrade in progress | Four labelled ordinary Mass arrangements, using the existing shared preparation rules. Visual upgrade: illustrated cupboard and furnishing board, movable object cards, pick/tap or keyboard placement, optional mouse drag, visible placements, feedback and reset. Other celebrations and missing-stock variations remain future work. | Baseline [PR #27](https://github.com/jddcef/mass-sim-liturgy/pull/27), merged; visual upgrade on `jddcef-visual-mini-games-and-mc`, not yet merged |
| MG03 | Line up the procession | Done | Arrange the available ministers and their carried objects for the selected scenario. Vary team sizes, roles and celebration options. First release: four labelled ordinary Mass arrangements, move ranks and assign carried objects; cross/candles form one shared rank. | [PR #27](https://github.com/jddcef/mass-sim-liturgy/pull/27), merged |
| MG04 | What comes next? | Idea | Order illustrated moments or choose the next action after a short scene. Vary celebrations and sequence length. | Not started |
| MG05 | Book-marker challenge | Idea | Prepare relevant pages in the simulated books, then find the right section when prompted. Vary celebrations, roles and clue levels. | Not started |
| MG06 | M.C. spot-check | In progress | Six seeded illustrated before-Mass scenes per round: four faults and two correct scenes. Click a misplaced book/chalice or a furnishing missing preparation, or choose Nothing wrong; optional hints, keyboard/touch controls and sourced explanations. Supported set only: Lectionary/ambo, Missal/chair, chalice/credence, white altar cloth. Fixed training church, not saved parish geometry. Missed cues, special rites and broader audits remain future work. | `jddcef-visual-mini-games-and-mc`; not yet merged |
| MG07 | Route rehearsal | Idea | Guide a server or usher between assigned places without cutting through benches or using an unsuitable shortcut. Vary layouts, start points and destinations. | Not started |
| MG08 | Pack away properly | Idea | Sort equipment into storage or choose its appropriate next action after the celebration. Vary equipment sets and plausible distractors. | Not started |
| MG09 | Sound-desk rehearsal | Idea | Match cues to slides or audio tracks, then start or fade them appropriately. Vary cue sequences and simulated equipment problems. | Not started |
| MG10 | Swing the thurible | Done | Eight abstract rhythm/direction beats with separate timing and direction feedback, a repeating marker, varied patterns, Slow and untimed Assisted controls. Not a universal incensation rubric. | [PR #28](https://github.com/jddcef/mass-sim-liturgy/pull/28), merged |
| MG11 | Light the candle | Done | Move a symbolic lighter flame to three wicks while countering tilt; symbolic hand-zone contact resets reach without injury. Small candle, Tall candle, Easter Candle; a game progression, not a ritual lighting order. Standard drift, Slow and untimed Assisted controls. | [PR #28](https://github.com/jddcef/mass-sim-liturgy/pull/28), merged |
| MG12 | Light the charcoal for the thurible | Done | Match abstract glow numbers and timing pulses across three virtual charcoal symbols. No real-world units, ignition procedure, actual flame or hot-equipment practice instructions. Slow and untimed Assisted controls. | [PR #28](https://github.com/jddcef/mass-sim-liturgy/pull/28), merged |

## Proposed practice-room design

These are starting suggestions, not a committed implementation order:

- Begin with MG01, MG02 and MG03, reusing the existing scene and game data.
- Offer a Practice room from setup, with roughly 1-3-minute rounds, optional
  hints, retries and short explanations after mistakes.
- Keep mini-game completion and performance stars separate from celebration
  milestones. Do not make a passing score a prerequisite for those milestones.
- Use accuracy and control rather than speed as the general emphasis. MG10
  explicitly uses timing as its practice mechanic; offer accessible alternatives.
- Keep the lighter, matches, flame and thurible activities entirely virtual.
  Avoid graphic injury, real-world fire-handling instructions or prompts to
  practise with actual flame or hot equipment.
- Consult Magisterium before implementing liturgical patterns, procession
  orders or handling rules as correct answers. The Easter Candle endpoint is
  the user's game-progression idea, not a claim about ritual candle-lighting
  order.
- Preserve offline `file://` support, classic scripts and low-spec graphics.

## Maintaining this list

When work starts, update the status and link the work. Mark an item Done only
after its playable behavior has been verified and merged. Record any remaining
scope in the same row or a linked issue. Add new ideas with new IDs rather than
replacing existing entries.
