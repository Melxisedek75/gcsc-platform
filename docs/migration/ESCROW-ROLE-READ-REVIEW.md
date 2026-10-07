# Escrow reads and stale roles: local candidate (2026-10-07 UTC)

Status: backend candidate only. No live escrow, signing, payment, integration,
deployment, or formal independent review.

## Finding

The canonical `GET /api/escrow/:id` and `GET /api/escrow/my/escrows` handlers
accepted any valid JWT for a participant ID without rechecking the stored
account's active status and current role. A disabled or demoted participant
could therefore read escrow records with a still-valid token. A focused local
HTTP regression initially received 200 for a disabled homeowner where 404 was
required. The two routes already set private/no-store and Vary headers; that
does not replace authorization.

## Candidate and checks

Backend commit `30288eae` adds current-role checks before disclosure and again
after the escrow/milestone database reads, so a concurrent disable or role
change fails closed. Individual escrow reads use a uniform 404; the personal
list returns 403. The commit contains only those read handlers and the focused
regression, separated from preexisting unstaged L05a document-upload changes.

Focused RED: 200 instead of 404 before the change. After the change, focused
regression 1/1, escrow lifecycle suite 54/54, full API Jest 342/342 PASS with
a dummy local JWT secret. QA isolated PostgreSQL 18.4 project-publication
33/33 PASS on the combined backend working-tree snapshot; test/PG exit 0,
evidence `postgres-baseline-4VLwrn`. This PG suite does not directly assert
the escrow stale-role read behavior. The exact isolated commit has not been
tested separately, and no independent review has approved it. Keep the
CODEX/CLAUDE gate and broader payment/milestone role audit open.
