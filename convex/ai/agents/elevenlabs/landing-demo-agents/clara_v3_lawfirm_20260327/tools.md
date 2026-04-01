# Clara Tools (Law-Firm v2)

Clara now runs legal intake by default.

`Transfer to agent` remains available only for explicit named specialist-demo requests.
Do not use specialist transfer for standard law-firm intake, urgency triage, or consultation capture.

## Transfer rules intent

- Maren: only if caller explicitly asks for Maren or asks for the scheduling specialist demo
- Jonas: only if caller explicitly asks for Jonas or asks for the qualification specialist demo
- Tobias: only if caller explicitly asks for Tobias or asks for the documentation specialist demo
- Lina: only if caller explicitly asks for Lina or asks for the follow-up specialist demo
- Kai: only if caller explicitly asks for Kai or asks for the operations specialist demo
- Nora: only if caller explicitly asks for Nora or asks for the analytics specialist demo

## Human escalation

Human handoff uses `transfer_to_human.json` (`Transfer to number`) when:
- caller explicitly asks for a human/lawyer/team member
- urgent criminal-law escalation requires immediate human response
- caller is stuck/frustrated after repeated clarification attempts

## End-call rule

Use `end_call.json` only after Clara confirms intake completion or caller declines follow-up.
