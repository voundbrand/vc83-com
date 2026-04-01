"use client"

import { Fragment } from "react"

export type WorkflowStep = {
  label: string
}

export type EscalationRule = {
  condition: string
  action: string
  severity: "critical" | "high" | "normal"
}

const SEVERITY_COLORS: Record<EscalationRule["severity"], string> = {
  critical: "#DC2626",
  high: "#E8520A",
  normal: "#16A34A",
}

export function WorkflowChain({
  steps,
  color,
}: {
  steps: WorkflowStep[]
  color: string
}) {
  return (
    <div className="flex flex-col" role="list" aria-label="Automated workflow steps">
      {steps.map((step, i) => (
        <Fragment key={i}>
          <div className="flex items-center gap-3" role="listitem">
            <div
              className="wf-node"
              style={{
                backgroundColor: `${color}1A`,
                borderColor: `${color}4D`,
                color,
              }}
            >
              {i + 1}
            </div>
            <span className="wf-label">{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div
              className="wf-connector"
              style={
                {
                  "--wf-color": color,
                  "--wf-delay": `${i * 0.25}s`,
                } as React.CSSProperties
              }
            />
          )}
        </Fragment>
      ))}
    </div>
  )
}

export function EscalationTree({
  rules,
}: {
  rules: EscalationRule[]
}) {
  return (
    <div className="flex flex-col gap-3" role="list" aria-label="Escalation rules">
      {rules.map((rule, i) => {
        const c = SEVERITY_COLORS[rule.severity]
        return (
          <div key={i} className="esc-row" role="listitem">
            <div
              className="esc-node"
              style={{
                backgroundColor: `${c}1A`,
                borderColor: `${c}4D`,
              }}
            />
            <span className="esc-condition">{rule.condition}</span>
            <div
              className="esc-arrow"
              style={
                {
                  "--esc-color": c,
                  "--esc-delay": `${i * 0.7}s`,
                } as React.CSSProperties
              }
            />
            <span className="esc-action">{rule.action}</span>
          </div>
        )
      })}
    </div>
  )
}
