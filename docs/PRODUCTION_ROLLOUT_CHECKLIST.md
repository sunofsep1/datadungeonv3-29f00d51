# Production Rollout Checklist

## Feature Flags

Flags are controlled in `src/lib/featureFlags.ts` and can be overridden in browser local storage:

- `feature:compactNurtureV2`
- `feature:compactTimelineV1`
- `feature:fastImportV1`

Set value to `"true"` or `"false"` in dev tools localStorage for canary rollout.

## Deployment Order

1. Deploy Supabase migrations and functions.
2. Deploy frontend with flags left in safe defaults.
3. Enable flags for pilot users.
4. Validate smoke tests, then enable for all users.

## Smoke Tests

- Nurture progression:
  - Enroll contact
  - Complete step
  - Next step scheduled exactly once
- Notifications:
  - Due notification appears once per step run
- Forms:
  - Contact/property address autocomplete fills suburb/state/postcode
- Timeline:
  - Contact timeline loads quickly and stays readable with large history

