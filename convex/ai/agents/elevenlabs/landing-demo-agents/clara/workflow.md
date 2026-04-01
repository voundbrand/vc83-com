# Clara Workflow (Law-Firm v2)

This workflow is now intake-first:

1. Clara handles the legal intake herself by default.
2. Specialist branches are only for explicit named specialist-demo requests.
3. Callback/follow-up goes through `Take Message` and then ends.

## Canvas shape

```text
Start
  ->
Subagent: Clara Legal Intake & Routing
  ├-> Agent transfer (Maren)   [explicit name request only]
  ├-> Agent transfer (Jonas)   [explicit name request only]
  ├-> Agent transfer (Tobias)  [explicit name request only]
  ├-> Agent transfer (Lina)    [explicit name request only]
  ├-> Agent transfer (Kai)     [explicit name request only]
  ├-> Agent transfer (Nora)    [explicit name request only]
  └-> Subagent: Take Message   [callback / follow-up]
       -> End
```

## Behavioral intent

### `Clara Legal Intake & Routing`

Default path for law-firm demo calls:
- identify practice area: Arbeitsrecht, Familienrecht, Mietrecht, Strafrecht
- detect urgency
- capture structured intake
- capture consultation request fields
- escalate to human when needed

Do not auto-route to specialist branches based on generic lane keywords.
Only route to specialist branches when caller explicitly asks for specialist demos by name.

### `Take Message`

Use for callers who want follow-up instead of staying in live intake.
Capture minimum details and close cleanly.

## Edge conditions summary

- `Maren/Jonas/Tobias/Lina/Kai/Nora`: explicit named specialist request only
- `callback / follow-up`: caller requests callback/follow-up or pauses live intake
- `ready to end`: callback details captured or caller declines
