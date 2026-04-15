# CRM next stages — ticket backlog

Prioritized from the mid-stage plan. Adjust owners and estimates locally.

## Stage A — Core data paths (highest ROI)

1. **Listing detail `useListing` hydration** — **Done:** `useListing` tries `*, contacts(id, name)` after base row, then falls back to `contacts` lookup by `contact_id` (see `useListings.ts`).
2. **Regression checklist** — **Done:** [crm-deploy-verify-checklist.md](./crm-deploy-verify-checklist.md) § “CRM smoke after migrations (~5 min)”.
3. **Vitest: merge + channels + smart lists** — `src/lib/mergeContactFields.test.ts`, `src/hooks/useContacts.test.ts` (`getAllEmails` / `getAllPhones`), `src/lib/contactSmartLists.test.ts` (`parseSmartListParam` / classification vs saved views). *DoD:* `npm run verify` green.
4. **Optional: Playwright smoke** — Login → contacts → open one contact → save nickname or notes. *DoD:* one green smoke on CI or nightly.

## Stage B — Operator clarity

5. **Copy review** — Page headers, merge dialog, edit-contact labels (tooltips) reviewed by one operator. *DoD:* no FAQ repeats in first week.
6. **Optional: short Loom** — Walkthrough of smart lists vs category vs urgency. *DoD:* link from internal wiki.

## Stage C — Engineering hygiene

7. **CI policy** — **Partially done:** `.github/workflows/ci.yml` runs `npm run verify` on `main` / PRs; README documents gate. Optional next: branch protection + `verify:lint` after ESLint cleanup.
8. **Supabase onboarding** — New dev follows [SUPABASE_WORKFLOW.md](./SUPABASE_WORKFLOW.md) once; note gaps. *DoD:* README link verified.

## Stage D — Deeper product (pick by priority)

**Stakeholder default (when no other constraint):** prioritize **nurture correctness** (9) first, then **listing board** (10), then **performance vs dashboard** clarity (11)—adjust if your quarter is listing-heavy or GCI-driven.

9. **Nurture** — **Partially done:** idempotent enroll (skip insert if active enrollment already exists for contact + sequence); contact panel shows enrolled time + pointer to timeline for manual enrolls. Optional: DB `enrollment_source` + acceptance tests.
10. **Listings board** — Kanban stage rules, sync with listing record, reporting slice. *DoD:* spec + milestone 1 shipped.
11. **Performance vs Dashboard** — **Partially done:** cross-links in Performance page header and Dashboard welcome subcopy. *DoD (remaining):* trim duplicate metrics if users still confuse the two screens.

## Stage E — Polish

12. **Performance** — Bundle / lazy-route audit; query staleTime defaults. *DoD:* Lighthouse or manual baseline saved.
13. **A11y** — Top 5 screens keyboard + labels pass. *DoD:* checklist complete.
14. **Print** — Contact print path verified for field appointments. *DoD:* one printed golden path.

---

**Default order to pull next:** 1 → 3 → 7 → 9 (adjust for your quarter’s bet).
