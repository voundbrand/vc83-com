# ElevenLabs Agent Assets

Canonical home for all ElevenLabs agent source files in this repository.

## Structure

1. `landing-demo-agents/`
   - Clara demo roster and adjacent runtime assets used by the landing demo sync harness.
2. `client-owned/`
   - per-client operational agent packages (for example `anne-becker`, `schloss-broellin-buchungsanfrage`).
3. `templates/`
   - platform-native template definitions (for example `kanzlei-mvp`).

## Source-of-truth contract

The ElevenLabs sync tooling resolves prompt, first-message, knowledge-base, tool JSON, guardrails, and workflow files from this root.

