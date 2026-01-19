// Utility functions for AI operations

export interface SensorData {
  id: string
  temperature: number
  humidity: number
  gasLevels: number
  windSpeed: number
  location: string
  timestamp: Date
}

export interface AlertData {
  id: string
  type: string
  severity: "low" | "medium" | "high" | "critical"
  sensorData: SensorData
  timestamp: Date
}

export async function analyzeSensor(sensorData: SensorData) {
  const response = await fetch("/api/ai/analyze-sensor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sensorData),
  })
  return response.json()
}

export async function getAlertReasoning(alertData: AlertData) {
  const response = await fetch("/api/ai/alert-reasoning", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      alertId: alertData.id,
      sensorData: alertData.sensorData,
      alertType: alertData.type,
      severity: alertData.severity,
    }),
  })
  return response.json()
}

export async function getPredictions(networkData: any) {
  const response = await fetch("/api/ai/predictions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(networkData),
  })
  return response.json()
}
