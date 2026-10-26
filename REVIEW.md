# PR review checklist

Review every item before approving. If an item does not apply, say why in Proof.

## Checklist

- **Correctness.** The change does what the ticket asks, and existing behavior still holds.
- **Proof present.** The PR includes command output or other evidence for the checks this change needs.
- **Scope.** The diff stays inside the ticket. No unrelated refactors, dependency bumps, or drive-by edits.
- **Secrets.** The diff and history contain no credentials, tokens, keys, or private env files.
- **Accessibility.** UI keeps keyboard access, visible focus, names/labels, and contrast. Say so when there is no UI.
- **Performance / Lighthouse (UI).** UI changes include a Lighthouse result and do not regress load or interaction. Say so when there is no UI.
- **Revert plan.** The PR says how to undo the change.

## Risk tiers

Use the highest tier the change touches.

### Low

Docs or copy only.

Requires the checklist items that apply, with proof in the PR.

### Medium

Ordinary product work.

Requires the checklist, proof for the criteria the change affects, and a reviewer approval.

### High

Prices or calculator, schema or migrations, auth, CI or deploy, secrets, or user data.

Requires all of the following:

- John approves the merge.
- Cross-model review.
- Proof for every criterion.
