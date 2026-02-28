# Slack v2 + v2.1 Operator Runbook

This runbook keeps current Slack mention flow and App Home DM flow intact while enabling optional Slack AI app functionality.

## Preconditions

- You have `manage_integrations` permission to connect/reconnect/disconnect.
- You are `super_admin` to change Slack setup settings (interaction mode and AI app mode).
- Slack app configuration access in [Slack App Dashboard](https://api.slack.com/apps).

## Manifest downloads in platform

In `Integrations > Slack > Instructions`, operators can download ready-to-import Slack manifests:

- `v1` (mentions only)
- `v2` (mentions + App Home DMs)
- `v2_1` (agentic Slack / AI app features)

These files are generated in-browser with current environment URLs and downloaded directly to the operator's computer (no Convex file upload required).
Choose JSON or YAML format before downloading.

## 1) Configure mode in VC83 Slack settings

1. Open `Integrations > Slack`.
2. In `Interaction Mode`, choose `Mentions + App Home DMs (v2)`.
3. In `Slack AI App Features (v2.1)`, choose:
   - `AI Features Off` to keep v2 only.
   - `AI Features On (v2.1)` to add Slack AI app scope/event requirements.
4. Click `Save Slack Mode` (or `Save BYOA + Mode` in BYOA mode).
5. Click `Reconnect Platform Profile` or `Reconnect Org BYOA Profile`.

## 2) Configure Slack app settings (Slack dashboard)

1. Open your app at [https://api.slack.com/apps](https://api.slack.com/apps).
2. Go to `App Home`.
3. Turn on `Allow users to send Slash commands and messages from the messages tab`.
4. Go to `Event Subscriptions`.
5. Ensure `Enable Events` is on.
6. Set Request URL to your VC83 endpoint (`/slack/events`).
   - This must be a public HTTPS URL reachable by Slack (for example your `*.convex.site` deployment URL + `/slack/events`).
   - `http://localhost:3000/slack/events` will always fail Slack verification.
7. Under `Subscribe to bot events`, add:
   - `app_mention`
   - `message.im`
   - `assistant_thread_started` (v2.1 mode)
   - `assistant_thread_context_changed` (v2.1 mode)
8. If using the agentic Slack experience (v2.1), enable your app's `Agents & AI Apps` feature in Slack app settings.
9. Go to `OAuth & Permissions`.
10. Ensure bot scopes include:
   - `app_mentions:read`
   - `channels:history`
   - `channels:read`
   - `chat:write`
   - `im:history` (v2 mode)
   - `assistant:write` (v2.1 mode)
11. If v2.1 is enabled, confirm manifest `features.assistant_view` exists with an `assistant_description`.
12. Reinstall app to workspace if Slack requests reinstall after scope/event changes.

Useful docs:
- [Slack AI app developer setup](https://docs.slack.dev/ai/developing-ai-apps/)
- [Display AI apps in Slack](https://slack.com/help/articles/33077521383059-Display-AI-apps-in-Slack)

## 3) Installer-level top bar setting (required per installer)

1. Each installer/user opens Slack `Preferences`.
2. Go to `Navigation`.
3. Under `App agents & assistants`, enable `Show app agents`.
4. This is the user-level control for showing the app agent on Slack's top bar.

## 4) Verification checklist

1. In VC83 Slack settings, confirm required scopes show `Granted`.
2. In Slack channel, mention app (`@AppName test mention`) and verify one response.
3. In App Home DM with the app, send message and verify one response.
4. Confirm non-DM channel `message` events do not trigger agent replies unless app mention/slash command.
5. If v2.1 is enabled, verify assistant thread lifecycle events are enabled in Slack and `assistant:write` is granted.

## Incident checks

- Symptom: `Missing required scopes` in VC83
  - Action: Reconnect after saving mode changes; reinstall app in Slack if prompted.
- Symptom: App Home DM does not route
  - Action: Verify App Home messages enabled and `message.im` subscribed.
- Symptom: Signature errors
  - Action: Verify signing secret for selected profile (platform vs BYOA) and reconnect if rotated.
