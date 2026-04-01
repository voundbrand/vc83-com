# Test Coverage

Fixtures live in `apps/one-of-one-landing/fixtures/elevenlabs`.

## Main Suites

`all-handoffs`
- Default gating suite.
- Covers all specialist roundtrips, realistic specialist-to-specialist routing via Clara, and the Kai -> Clara -> Maren regression.

`specialist-roundtrips`
- One Clara -> specialist -> Clara check for each phone-demo specialist.

`specialist-ring`
- Realistic chain coverage across the roster:
- Maren -> Clara -> Jonas
- Jonas -> Clara -> Tobias
- Tobias -> Clara -> Lina
- Lina -> Clara -> Kai
- Kai -> Clara -> Nora
- Kai -> Clara -> Maren

`grand-tour`
- One long stress-call across every specialist.
- Useful for exploratory stress testing, but not the primary gate.

## Recommended Validation Flow

1. `npm run landing:elevenlabs:sync -- --all`
2. `npm run landing:elevenlabs:sync -- --all --write`
3. `npm run landing:elevenlabs:simulate -- --suite all-handoffs`

## Agent Coverage Map

- Clara: every fixture
- Maren: `clara-maren-clara-roundtrip`, `clara-maren-clara-jonas-handoff`, `clara-kai-clara-maren-regression`
- Jonas: `clara-jonas-clara-roundtrip`, `clara-maren-clara-jonas-handoff`, `clara-jonas-clara-tobias-handoff`
- Tobias: `clara-tobias-clara-roundtrip`, `clara-jonas-clara-tobias-handoff`, `clara-tobias-clara-lina-handoff`
- Lina: `clara-lina-clara-roundtrip`, `clara-tobias-clara-lina-handoff`, `clara-lina-clara-kai-handoff`
- Kai: `clara-kai-clara-roundtrip`, `clara-lina-clara-kai-handoff`, `clara-kai-clara-nora-handoff`, `clara-kai-clara-maren-regression`
- Nora: `clara-nora-clara-roundtrip`, `clara-kai-clara-nora-handoff`
- Samantha: not part of the phone handoff suite
