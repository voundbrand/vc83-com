import { generateObject } from "ai"
import { z } from "zod"

const predictionSchema = z.object({
  predictions: z.array(
    z.object({
      id: z.string(),
      location: z.string(),
      riskLevel: z.enum(["low", "medium", "high", "critical"]),
      probability: z.number().min(0).max(100),
      timeframe: z.string(),
      reasoning: z.string(),
      affectedArea: z.string(),
      confidence: z.number().min(0).max(100),
    }),
  ),
})

export async function POST(req: Request) {
  const { sensorNetwork, weatherData, historicalData } = await req.json()

  const { object } = await generateObject({
    model: "anthropic/claude-sonnet-4.5",
    schema: predictionSchema,
    prompt: `You are an AI wildfire prediction system for Dryad Networks analyzing sensor networks in Brandenburg, Germany.

Current Sensor Network Status:
${JSON.stringify(sensorNetwork, null, 2)}

Weather Conditions:
${JSON.stringify(weatherData, null, 2)}

Historical Fire Data:
${JSON.stringify(historicalData, null, 2)}

Generate 7 predictive insights about potential wildfire risks in the next 24-72 hours. For each prediction:
1. Identify specific location/zone
2. Assess risk level
3. Calculate probability percentage
4. Specify timeframe
5. Provide detailed reasoning
6. Estimate affected area
7. Confidence level

Focus on areas with:
- High temperature + low humidity combinations
- Elevated gas sensor readings
- Strong wind conditions
- Historical fire-prone zones
- Dense vegetation areas`,
    maxOutputTokens: 2000,
  })

  return Response.json(object)
}
