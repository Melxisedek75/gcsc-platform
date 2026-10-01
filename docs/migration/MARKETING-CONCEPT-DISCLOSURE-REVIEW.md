# Generated hero image disclosure candidate

Status: SOURCE_CANDIDATE_REVIEW_REQUIRED, 2026-10-01. No merge, push or deploy.

- Worktree: `C:\gcsc-platform\.worktrees\marketing-october`
- Branch: `codex/marketing-concept-disclosure-20261001`
- Base: `7d5a8b3d`; candidate: `b229fd4e`
- Scope: visible hero copy states that the image is an AI-generated concept,
  not a customer project; claim ledger reflects the boundary. The browser
  verifier checks that this disclosure is present and not clipped, and accepts
  an output directory/no-screenshot option to preserve prior evidence.

Checks on exact candidate:

- Red before source change: Edge verifier failed all eight variants because the
  disclosure was absent; exit 1. Stored under
  `.tmp/marketing-concept-disclosure-red/result.json` in the marketing worktree.
- Green after change: Edge 154, eight viewport/text variants, no horizontal
  overflow, hero clipping, page errors or missing disclosure; exit 0. Stored
  under `.tmp/marketing-concept-disclosure-green/result.json`. Existing
  marketing-browser screenshots were not overwritten.
- `node apps/marketing/validate-static.mjs --test`: 18/18, exit 0.
- `node apps/marketing/validate-static.mjs`: two pages/seven CTAs, exit 0.
- `node --check apps/marketing/verify-browser.cjs`, `git diff --check`, and
  staged diff check: exit 0. Local 390/1440 px first-viewport JPEGs were
  inspected in `.tmp/marketing-concept-{mobile,desktop}.jpg`; the next section
  remains visible and the note does not overlap CTA.

The image-rights check, independent CODEX/CLAUDE review gate, exact receiving
verification, live domain and full accessibility remain open. This candidate
does not establish rights, a real customer story, a final video or release
approval.
