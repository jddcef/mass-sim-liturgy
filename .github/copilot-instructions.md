# Copilot instructions

Before changing anything, read `docs/SPEC.md` (requirements and constraints)
and `docs/DEVELOPMENT.md` (resume checklist, status and workflow). Follow the
per-change checklist there.

Key rules:
- Keep `file://` support: classic scripts, no build step and no network.
- Keep liturgical texts short and paraphrased.
- Log every decision in `docs/GAME-DECISIONS.md`.
- Keep all four Node tests and CI green.
- Update the Status section of `docs/DEVELOPMENT.md` when you finish.