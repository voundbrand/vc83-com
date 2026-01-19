import { generateObject } from "ai"
import { z } from "zod"

const sensorAnalysisSchema = z.object({
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
  recommendations: z.array(z.string()),
  predictedFireProbability: z.number().min(0).max(100),
  timeToAction: z.string(),
})

export async function POST(req: Request) {
  const { sensorId, temperature, humidity, gasLevels, windSpeed, location } = await req.json()

  const { object } = await generateObject({
    model: "anthropic/claude-sonnet-4.5",
    schema: sensorAnalysisSchema,
    prompt: `You are an AI wildfire detection system analyzing sensor data from Dryad Networks' Silvanet IoT sensors in Brandenburg, Germany forests.

Analyze the following sensor data and provide a detailed risk assessment:

Sensor ID: ${sensorId}
Location: ${location}
Temperature: ${temperature}°C
Humidity: ${humidity}%
Gas Levels (CO, VOCs): ${gasLevels}
Wind Speed: ${windSpeed} km/h

Provide:
1. Risk level (low/medium/high/critical)
2. Confidence percentage
3. Detailed reasoning for your assessment
4. Specific recommendations for forest management
5. Predicted fire probability percentage
6. Estimated time to take action

Consider factors like:
- Temperature and humidity combinations
- Gas sensor readings (CO and VOC levels indicate combustion)
- Wind conditions affecting fire spread
- Historical patterns in Brandenburg forests
- Seasonal factors`,
  })

  return Response.json(object)
}
