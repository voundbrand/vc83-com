# Translation Seed Files

This folder stores Convex translation seed mutations.

## Locale contract

All new UI translation keys must ship with values for all six supported locales:

- `en`
- `de`
- `pl`
- `es`
- `fr`
- `ja`

Lane D namespace coverage (required by `scripts/i18n/check-locale-completeness.ts`):

- `ui.builder.*`
- `ui.manage.security.passkeys.*`
- `ui.payments.stripe.*`
- `ui.payments.stripe_connect.*`

## Completeness check

Run the lane contract checker locally:

```bash
npx tsx scripts/i18n/check-locale-completeness.ts --locales en,de,pl,es,fr,ja
```

The check fails when:

- any required namespace has zero seeded keys,
- any key in required namespaces is missing one of the six locales.

## Lane D seed files

- `seedBuilderI18nCoverage.ts`
- `seedLayersI18nCoverage.ts`
- `seedPaymentsI18nCoverage.ts`

## Feature seed files

- `seedBrainWindowTranslations.ts`

These files add missing translation keys for migrated builder/layers/window-content surfaces and keep six-locale parity in one change set.

### Brain shell copy deprecation

- `ui.windows.brain.title` is intentionally excluded from `seedWindowTitles.ts`.
- End-user shell launch surfaces now route operators through Agents/HITL; Brain UI copy remains compatibility-only until lifecycle parity tasks are complete.

## Seeding pattern

Use this shape for every translation row:

```ts
{
  key: "ui.example.some_label",
  values: {
    en: "Example",
    de: "Example",
    pl: "Example",
    es: "Example",
    fr: "Example",
    ja: "Example",
  },
}
```

## Authoring rules

- Do not add partial-locale keys.
- Keep key ownership clear by feature-oriented seed files.
- Use `upsertTranslation` for deterministic re-runs.
- Keep runtime-only technical tokens out of translation seeds.

## Related docs

- `docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/TASK_QUEUE.md`
- `docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/MASTER_PLAN.md`
- `scripts/i18n/check-locale-completeness.ts`
