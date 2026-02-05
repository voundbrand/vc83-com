# Layers Workflow Composition Patterns

You compose Layers workflows by selecting a trigger node, wiring it through logic and action nodes, and connecting to integrations. Every workflow is a directed acyclic graph of nodes and edges.

## Workflow Structure

```typescript
{
  nodes: LayerNode[],    // Array of positioned nodes
  edges: LayerEdge[],    // Array of connections between nodes
  triggers: string[],    // Trigger events this workflow listens for
  metadata: { ... }      // Description, version, tags
}
```

**Status flow:** `draft` -> `ready` -> `active` -> `paused` -> `error` -> `archived`

**Create with:** `createWorkflow(sessionId, organizationId, name, description)`

**Save with:** `saveWorkflow(sessionId, workflowId, nodes, edges, triggers)`

**Activate with:** `updateWorkflowStatus(sessionId, workflowId, "active")`

---

## Node Categories

### Trigger Nodes (Entry Points)

Every workflow starts with exactly one trigger node.

| Node Type | Config | Use When |
|-----------|--------|----------|
| `trigger_form_submitted` | `formId` | Lead capture, registration, application |
| `trigger_payment_received` | `paymentProvider`: `"any"` \| `"stripe"` \| `"lc_checkout"` | Purchase confirmation, order fulfillment |
| `trigger_booking_created` | — | Appointment booked, class registered |
| `trigger_contact_created` | — | New contact added to CRM |
| `trigger_contact_updated` | — | Contact record changed (tag added, stage moved) |
| `trigger_webhook` | `path`, `secret` | External system integration |
| `trigger_schedule` | `cronExpression`, `timezone` | Recurring tasks, batch operations |
| `trigger_manual` | `sampleData` (JSON) | Testing, one-off executions |

### LC Native Nodes (Platform Actions)

These execute against platform ontology — creating, updating, and managing platform objects.

| Node Type | Actions | Use When |
|-----------|---------|----------|
| `lc_crm` | `create-contact`, `update-contact`, `move-pipeline-stage`, `detect-employer-billing` | Managing contacts and pipeline |
| `lc_forms` | `create-form-response`, `validate-registration` | Processing form data |
| `lc_invoicing` | `generate-invoice`, `consolidated-invoice-generation` | Billing and invoicing |
| `lc_checkout` | `create-transaction`, `calculate-pricing` | Payment processing |
| `lc_email` | `send-confirmation-email`, `send-admin-notification` | Platform email (config: `to`, `subject`, `body`) |
| `lc_ai_agent` | — | AI processing (config: `prompt`, `model`: `"default"` \| `"claude-sonnet"` \| `"gpt-4o"`) |

### Integration Nodes (External Services)

| Node Type | Status | Actions |
|-----------|--------|---------|
| `activecampaign` | available | `add_contact`, `add_tag`, `add_to_list`, `add_to_automation` |
| `whatsapp_business` | available | `send_message`, `send_template` |
| `resend` | available | Config: `to`, `subject`, `htmlContent` |
| `hubspot` | coming_soon | `create_contact`, `update_contact`, `create_deal`, `add_to_list` |
| `salesforce` | coming_soon | `create_lead`, `update_opportunity` |

### Logic Nodes (Flow Control)

| Node Type | Handles | Config | Use When |
|-----------|---------|--------|----------|
| `if_then` | in: `input` -> out: `true` \| `false` | `expression` | Conditional branching |
| `split_ab` | in: `input` -> out: `branch_a` \| `branch_b` | `splitPercentage` | A/B testing |
| `merge` | in: `input_a` + `input_b` -> out: `output` | `mergeStrategy`: `"wait_all"` \| `"first"` | Joining parallel paths |
| `wait_delay` | in: `input` -> out: `output` | `duration`, `unit`: `"seconds"` \| `"minutes"` \| `"hours"` \| `"days"` | Timed delays |
| `loop_iterator` | in: `input` -> out: `each_item` \| `completed` | `arrayField`, `maxIterations` | Batch processing |
| `http_request` | in: `input` -> out: `output` | `url`, `method`, `headers`, `body` | External API calls |
| `code_block` | in: `input` -> out: `output` | `code` (JavaScript) | Custom data transformation |

---

## Wiring Patterns

### Pattern 1: Lead Capture -> CRM -> Email

The most common pattern. Form submission creates a contact and sends confirmation.

```
trigger_form_submitted -> lc_crm (create-contact) -> lc_email (send-confirmation-email)
                                                   -> activecampaign (add_contact, add_tag)
```

**Edges:**
- `trigger_form_submitted.output` -> `lc_crm.input`
- `lc_crm.output` -> `lc_email.input`
- `lc_crm.output` -> `activecampaign.input`

### Pattern 2: Payment -> Invoice -> Notification

Purchase confirmation with invoice generation and admin notification.

```
trigger_payment_received -> lc_invoicing (generate-invoice) -> lc_email (send-confirmation-email)
                                                             -> lc_email (send-admin-notification)
```

### Pattern 3: Conditional Routing

Route contacts based on form answers or contact properties.

```
trigger_form_submitted -> lc_crm (create-contact) -> if_then (check property type)
                                                        ├── true: lc_crm (move-pipeline-stage: "qualified")
                                                        └── false: lc_crm (move-pipeline-stage: "nurture")
```

### Pattern 4: Booking Confirmation + Reminder

Appointment booked triggers confirmation and scheduled reminder.

```
trigger_booking_created -> lc_email (send-confirmation-email)
                        -> wait_delay (1 day before) -> lc_email (send reminder)
                        -> activecampaign (add_tag: "booked")
```

### Pattern 5: Multi-Channel Outreach

Same trigger fans out to multiple channels.

```
trigger_contact_created -> lc_email (welcome email)
                        -> whatsapp_business (send_template: "welcome")
                        -> activecampaign (add_to_automation: "onboarding")
```

### Pattern 6: A/B Test with Merge

Split traffic, test two approaches, merge results.

```
trigger_form_submitted -> split_ab (50/50)
                            ├── branch_a: lc_email (variant A)
                            └── branch_b: lc_email (variant B)
                          -> merge (wait_all) -> lc_crm (update-contact: tag winner)
```

### Pattern 7: Webhook-Driven Integration

External system triggers platform actions.

```
trigger_webhook -> code_block (transform payload) -> lc_crm (create-contact)
                                                   -> lc_forms (create-form-response)
```

### Pattern 8: Scheduled Batch Operations

Recurring workflows for maintenance, reporting, reminders.

```
trigger_schedule (daily 9am) -> http_request (fetch external data)
                              -> loop_iterator (process each record)
                                  -> lc_crm (update-contact)
```

---

## Edge Rules

1. **Exact handle matching.** Connect `sourceHandle` to `targetHandle` using the handle IDs defined on each node type. Don't invent handles.
2. **One trigger per workflow.** Multiple triggers = multiple workflows.
3. **Fan-out is fine.** One output can connect to multiple downstream nodes.
4. **Fan-in requires merge.** Multiple paths converging should use a `merge` node with `wait_all` or `first` strategy.
5. **Delays are explicit.** Use `wait_delay` nodes, not implicit timing.
6. **Type matching matters.** Use exact node `type` strings from the registry.

## Layout Guidelines

- Trigger node at top (y: 0)
- Flow left-to-right or top-to-bottom
- 200px horizontal spacing, 150px vertical spacing
- Group related nodes visually
