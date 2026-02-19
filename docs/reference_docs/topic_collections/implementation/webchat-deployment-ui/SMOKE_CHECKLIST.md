# Webchat Deployment Flow Smoke Checklist

**Last updated:** 2026-02-19  
**Workstream:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/webchat-deployment-ui`

---

## Scope

End-to-end deployment flow coverage for lane `D` (`WDU-011`):

1. Bootstrap contract fetch
2. Snippet generation/copy readiness
3. Config fetch
4. Message send success

---

## Automated Smoke Harness

Run the deterministic smoke harness test:

```bash
npx vitest run tests/unit/shell/webchat-deployment-flow.smoke.test.ts
```

Harness implementation:

- `tests/helpers/webchat-deployment-smoke.ts`
- `tests/unit/shell/webchat-deployment-flow.smoke.test.ts`

Expected assertions:

1. Request order is fixed (`bootstrap -> config -> message`).
2. Generated copied snippet contains deploy-critical fields (`data-agent-id`, `data-channel`).
3. Message response returns a valid `sessionToken`.

---

## Live Endpoint Smoke (Manual)

Set environment variables:

```bash
export APP_BASE_URL="https://<your-app-host>"
export AGENT_ID="<agent_id>"
```

1. Bootstrap contract:

```bash
curl -sS "${APP_BASE_URL}/api/v1/webchat/bootstrap/${AGENT_ID}?channel=webchat" | jq .
```

2. Config contract:

```bash
curl -sS "${APP_BASE_URL}/api/v1/webchat/config/${AGENT_ID}?channel=webchat" | jq .
```

3. First message send:

```bash
curl -sS "${APP_BASE_URL}/api/v1/webchat/message" \
  -H "Content-Type: application/json" \
  -d "{\"agentId\":\"${AGENT_ID}\",\"message\":\"Smoke check ping\"}" | jq .
```

4. Resume message with returned `sessionToken`:

```bash
curl -sS "${APP_BASE_URL}/api/v1/webchat/message" \
  -H "Content-Type: application/json" \
  -d "{\"agentId\":\"${AGENT_ID}\",\"sessionToken\":\"<session_token>\",\"message\":\"Smoke check resume\"}" | jq .
```

---

## Pass Criteria

1. Bootstrap/config calls return `200`.
2. Bootstrap payload includes `contractVersion`, `agentId`, `deploymentDefaults`.
3. Message calls return `200` and include `sessionToken`.
4. Automated smoke harness test passes without order or contract assertion failures.
