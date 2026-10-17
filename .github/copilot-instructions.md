# Copilot instructions

Before changing anything, read `docs/SPEC.md` (requirements and constraints)
and `docs/DEVELOPMENT.md` (resume checklist, status and workflow). Follow the
per-change checklist there.

Key rules:
- Never commit directly to `main`. Make changes on a topic branch and submit
  them through a pull request; do not bypass the PR workflow.
- For liturgical or Catholic questions, factual claims, or unresolved
  interpretations, consult the Magisterium MCP server. Use its sources to
  support relevant claims, and ask the user when the sources do not settle an
  ambiguity.
- Keep `file://` support: classic scripts, no build step and no network.
- Keep liturgical texts short and paraphrased.
- Log every decision in `docs/GAME-DECISIONS.md`.
- Keep all four Node tests and CI green.
- Update the Status section of `docs/DEVELOPMENT.md` when you finish.