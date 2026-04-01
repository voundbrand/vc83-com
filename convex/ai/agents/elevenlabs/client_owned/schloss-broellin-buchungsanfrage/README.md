# Schloss Broellin Buchungsanfrage Agent

This package is a ready-to-paste ElevenLabs voice-agent setup to replace the booking inquiry form:

- https://broellin.de/buchungsanfrage/

It is based on the public form fields as observed on 2026-03-26.

## Files

1. `system-prompt.md`
2. `first-message.md`
3. `knowledge-base.md`
4. `transfer_to_human.json`
5. `end_call.json`
6. `setup.md`

## Intended outcome

The agent should:

1. collect booking request details by phone (same scope as the web form)
2. keep a clear truth boundary (no fake booking confirmations)
3. produce a clean final verbal recap for manual handoff

## Usage

Follow `setup.md` in ElevenLabs:

1. create or open the target agent
2. paste `system-prompt.md` into system prompt
3. paste `first-message.md` into first message
4. upload `knowledge-base.md` as a text knowledge base document
5. configure built-in tools from the JSON files

