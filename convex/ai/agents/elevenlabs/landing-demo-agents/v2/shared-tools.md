# Shared Tools

## Canonical Files

- `../end_call.json`
- `../transfer_to_clara.json`
- `../transfer_to_human.json`
- `../clara/tools.json`
- `../clara/workflow.json`

## Ownership

`end_call.json`
- Shared end-call behavior for the managed agents.

`transfer_to_clara.json`
- Shared specialist return path back to Clara.
- Used by Maren, Jonas, Tobias, Lina, Kai, and Nora.
- Current contract: only return to Clara when the caller explicitly asks to leave the current lane or wants the main concierge again.

`transfer_to_human.json`
- Shared human handoff path.
- Used anywhere the caller explicitly asks for a real person, founder, or team member.

`clara/tools.json`
- Clara-only specialist routing map.
- Defines direct transfers from Clara to Maren, Jonas, Tobias, Lina, Kai, and Nora.

`clara/workflow.json`
- Clara-only workflow.
- Handles greeting, receptionist mode, and specialist routing nodes.

## Change Rule

If a routing behavior change affects more than one specialist, prefer changing the shared tool file first instead of copying prompt-only fixes into multiple places.
