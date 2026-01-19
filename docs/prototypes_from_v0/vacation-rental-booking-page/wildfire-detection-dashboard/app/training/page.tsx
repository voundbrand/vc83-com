"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Brain, Database, Settings, TrendingUp, CheckCircle2 } from "lucide-react"

export default function TrainingPage() {
  const [isTraining, setIsTraining] = useState(false)
  const [trainingProgress, setTrainingProgress] = useState(0)
  const [trainingLogs, setTrainingLogs] = useState<string[]>([])
  const [modelConfig, setModelConfig] = useState({
    epochs: "10",
    batchSize: "32",
    learningRate: "0.001",
    trainingType: "supervised",
  })

  const startTraining = async () => {
    setIsTraining(true)
    setTrainingProgress(0)
    setTrainingLogs([])

    try {
      const response = await fetch("/api/ai/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trainingData: {
            datasetName: "Brandenburg Forest Sensor Data 2024",
            recordCount: "1.2M",
          },
          modelConfig: {
            epochs: Number.parseInt(modelConfig.epochs),
            batchSize: Number.parseInt(modelConfig.batchSize),
            learningRate: Number.parseFloat(modelConfig.learningRate),
            trainingType: modelConfig.trainingType,
          },
        }),
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        let buffer = ""
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            if (line.trim()) {
              setTrainingLogs((prev) => [...prev, line])
              // Simulate progress based on log entries
              setTrainingProgress((prev) => Math.min(prev + 5, 100))
            }
          }
        }
      }

      setTrainingProgress(100)
    } catch (error) {
      console.error("Training error:", error)
      setTrainingLogs((prev) => [...prev, `Error: ${error}`])
    } finally {
      setIsTraining(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-mono text-3xl font-bold text-white">AI Model Training</h1>
            <p className="mt-1 font-mono text-sm text-gray-400">Fine-tune Mistral AI on wildfire detection data</p>
          </div>
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 font-mono text-emerald-400">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Model Ready
          </Badge>
        </div>

        <Tabs defaultValue="configure" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-zinc-900">
            <TabsTrigger value="configure" className="font-mono">
              <Settings className="mr-2 h-4 w-4" />
              Configure
            </TabsTrigger>
            <TabsTrigger value="train" className="font-mono">
              <Brain className="mr-2 h-4 w-4" />
              Train
            </TabsTrigger>
            <TabsTrigger value="metrics" className="font-mono">
              <TrendingUp className="mr-2 h-4 w-4" />
              Metrics
            </TabsTrigger>
          </TabsList>

          {/* Configure Tab */}
          <TabsContent value="configure" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-zinc-800 bg-zinc-900/50">
                <CardHeader>
                  <CardTitle className="flex items-center font-mono text-white">
                    <Database className="mr-2 h-5 w-5 text-blue-400" />
                    Training Dataset
                  </CardTitle>
                  <CardDescription className="font-mono">Configure your training data source</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="dataset" className="font-mono text-gray-300">
                      Dataset
                    </Label>
                    <Select defaultValue="brandenburg-2024">
                      <SelectTrigger id="dataset" className="border-zinc-700 bg-zinc-800 font-mono text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-zinc-700 bg-zinc-800">
                        <SelectItem value="brandenburg-2024" className="font-mono">
                          Brandenburg Forest 2024 (1.2M records)
                        </SelectItem>
                        <SelectItem value="brandenburg-2023" className="font-mono">
                          Brandenburg Forest 2023 (980K records)
                        </SelectItem>
                        <SelectItem value="combined" className="font-mono">
                          Combined Dataset (2.1M records)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-mono text-gray-300">Dataset Statistics</Label>
                    <div className="space-y-1 rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Records:</span>
                        <span className="text-white">1,247,893</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Fire Events:</span>
                        <span className="text-orange-400">1,247</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Normal Readings:</span>
                        <span className="text-emerald-400">1,246,646</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Sensors:</span>
                        <span className="text-white">3,847</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-zinc-800 bg-zinc-900/50">
                <CardHeader>
                  <CardTitle className="flex items-center font-mono text-white">
                    <Settings className="mr-2 h-5 w-5 text-purple-400" />
                    Model Configuration
                  </CardTitle>
                  <CardDescription className="font-mono">Fine-tune training parameters</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="epochs" className="font-mono text-gray-300">
                      Epochs
                    </Label>
                    <Input
                      id="epochs"
                      type="number"
                      value={modelConfig.epochs}
                      onChange={(e) => setModelConfig({ ...modelConfig, epochs: e.target.value })}
                      className="border-zinc-700 bg-zinc-800 font-mono text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="batchSize" className="font-mono text-gray-300">
                      Batch Size
                    </Label>
                    <Input
                      id="batchSize"
                      type="number"
                      value={modelConfig.batchSize}
                      onChange={(e) => setModelConfig({ ...modelConfig, batchSize: e.target.value })}
                      className="border-zinc-700 bg-zinc-800 font-mono text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="learningRate" className="font-mono text-gray-300">
                      Learning Rate
                    </Label>
                    <Input
                      id="learningRate"
                      type="number"
                      step="0.0001"
                      value={modelConfig.learningRate}
                      onChange={(e) => setModelConfig({ ...modelConfig, learningRate: e.target.value })}
                      className="border-zinc-700 bg-zinc-800 font-mono text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trainingType" className="font-mono text-gray-300">
                      Training Type
                    </Label>
                    <Select
                      value={modelConfig.trainingType}
                      onValueChange={(value) => setModelConfig({ ...modelConfig, trainingType: value })}
                    >
                      <SelectTrigger id="trainingType" className="border-zinc-700 bg-zinc-800 font-mono text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-zinc-700 bg-zinc-800">
                        <SelectItem value="supervised" className="font-mono">
                          Supervised Learning
                        </SelectItem>
                        <SelectItem value="reinforcement" className="font-mono">
                          Reinforcement Learning
                        </SelectItem>
                        <SelectItem value="transfer" className="font-mono">
                          Transfer Learning
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Train Tab */}
          <TabsContent value="train" className="space-y-4">
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardHeader>
                <CardTitle className="font-mono text-white">Training Progress</CardTitle>
                <CardDescription className="font-mono">
                  {isTraining ? "Training in progress..." : "Ready to start training"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-mono text-sm">
                    <span className="text-gray-400">Progress</span>
                    <span className="text-white">{trainingProgress}%</span>
                  </div>
                  <Progress value={trainingProgress} className="h-2" />
                </div>

                <Button
                  onClick={startTraining}
                  disabled={isTraining}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 font-mono font-semibold text-white hover:from-orange-600 hover:to-red-600"
                >
                  {isTraining ? "Training..." : "Start Training"}
                </Button>

                {trainingLogs.length > 0 && (
                  <div className="space-y-2">
                    <Label className="font-mono text-gray-300">Training Logs</Label>
                    <div className="max-h-96 space-y-1 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs">
                      {trainingLogs.map((log, index) => (
                        <div key={index} className="text-gray-300">
                          <span className="text-gray-600">[{new Date().toLocaleTimeString()}]</span> {log}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-zinc-800 bg-zinc-900/50">
                <CardHeader>
                  <CardTitle className="font-mono text-sm text-gray-400">Training Accuracy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-mono text-3xl font-bold text-emerald-400">98.7%</div>
                  <p className="mt-1 font-mono text-xs text-gray-500">+2.3% from baseline</p>
                </CardContent>
              </Card>

              <Card className="border-zinc-800 bg-zinc-900/50">
                <CardHeader>
                  <CardTitle className="font-mono text-sm text-gray-400">Validation Loss</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-mono text-3xl font-bold text-blue-400">0.0234</div>
                  <p className="mt-1 font-mono text-xs text-gray-500">-0.0156 improvement</p>
                </CardContent>
              </Card>

              <Card className="border-zinc-800 bg-zinc-900/50">
                <CardHeader>
                  <CardTitle className="font-mono text-sm text-gray-400">F1 Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-mono text-3xl font-bold text-purple-400">0.964</div>
                  <p className="mt-1 font-mono text-xs text-gray-500">Excellent performance</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardHeader>
                <CardTitle className="font-mono text-white">Model Performance</CardTitle>
                <CardDescription className="font-mono">Detailed evaluation metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 font-mono text-sm">
                  <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                    <span className="text-gray-400">Precision</span>
                    <span className="text-white">97.2%</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                    <span className="text-gray-400">Recall</span>
                    <span className="text-white">96.8%</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                    <span className="text-gray-400">False Positive Rate</span>
                    <span className="text-emerald-400">0.8%</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                    <span className="text-gray-400">Detection Speed</span>
                    <span className="text-orange-400">12 minutes avg</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
