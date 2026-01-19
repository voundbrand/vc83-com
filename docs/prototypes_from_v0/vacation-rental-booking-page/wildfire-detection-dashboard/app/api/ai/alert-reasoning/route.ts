import { generateText } from "ai"

export async function POST(req: Request) {
  const { alertId, sensorData, alertType, severity } = await req.json()

  const { text } = await generateText({
    model: "anthropic/claude-sonnet-4.5",
    prompt: `You are an AI wildfire detection system explaining alert reasoning for Dryad Networks' forest monitoring system.

Alert Details:
- Alert ID: ${alertId}
- Type: ${alertType}
- Severity: ${severity}
- Sensor Data: ${JSON.stringify(sensorData, null, 2)}

Provide a clear, detailed explanation of:
1. Why this alert was triggered
2. What the sensor data indicates
3. The potential risks if not addressed
4. Recommended immediate actions
5. Historical context if relevant

Keep the explanation professional but accessible to forest management teams.`,
    maxOutputTokens: 1000,
  })

  return Response.json({ reasoning: text })
}
