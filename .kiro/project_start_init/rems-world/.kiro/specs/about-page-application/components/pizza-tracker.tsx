"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { ThumbsUp, ThumbsDown, TrendingUp, Users } from "lucide-react";

interface Vote {
  choice: "yes" | "no";
  timestamp: number;
}

export function PizzaTracker() {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [userVote, setUserVote] = useState<"yes" | "no" | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load votes from localStorage on mount
  useEffect(() => {
    const savedVotes = localStorage.getItem("pizza-votes");
    const savedUserVote = localStorage.getItem("user-pizza-vote");

    if (savedVotes) {
      setVotes(JSON.parse(savedVotes));
    } else {
      // Initialize with some sample data
      const initialVotes: Vote[] = [
        { choice: "yes", timestamp: Date.now() - 86400000 },
        { choice: "no", timestamp: Date.now() - 82800000 },
        { choice: "yes", timestamp: Date.now() - 79200000 },
        { choice: "no", timestamp: Date.now() - 75600000 },
        { choice: "yes", timestamp: Date.now() - 72000000 },
        { choice: "no", timestamp: Date.now() - 68400000 },
        { choice: "yes", timestamp: Date.now() - 64800000 },
        { choice: "no", timestamp: Date.now() - 61200000 },
        { choice: "yes", timestamp: Date.now() - 57600000 },
        { choice: "no", timestamp: Date.now() - 54000000 },
        { choice: "yes", timestamp: Date.now() - 50400000 },
        { choice: "no", timestamp: Date.now() - 46800000 },
        { choice: "yes", timestamp: Date.now() - 43200000 },
        { choice: "no", timestamp: Date.now() - 39600000 },
        { choice: "yes", timestamp: Date.now() - 36000000 },
      ];
      setVotes(initialVotes);
      localStorage.setItem("pizza-votes", JSON.stringify(initialVotes));
    }

    if (savedUserVote) {
      setUserVote(savedUserVote as "yes" | "no");
    }
  }, []);

  const handleVote = (choice: "yes" | "no") => {
    if (userVote) return; // Already voted

    setIsLoading(true);

    // Simulate API delay
    setTimeout(() => {
      const newVote: Vote = { choice, timestamp: Date.now() };
      const updatedVotes = [...votes, newVote];

      setVotes(updatedVotes);
      setUserVote(choice);
      setIsLoading(false);

      // Save to localStorage
      localStorage.setItem("pizza-votes", JSON.stringify(updatedVotes));
      localStorage.setItem("user-pizza-vote", choice);
    }, 1000);
  };

  const yesVotes = votes.filter((v) => v.choice === "yes").length;
  const noVotes = votes.filter((v) => v.choice === "no").length;
  const totalVotes = votes.length;
  const yesPercentage = totalVotes > 0 ? (yesVotes / totalVotes) * 100 : 0;
  const noPercentage = totalVotes > 0 ? (noVotes / totalVotes) * 100 : 0;

  const pieData = [
    { name: "Yes to Pineapple", value: yesVotes, color: "#d97706" },
    { name: "No to Pineapple", value: noVotes, color: "#374151" },
  ];

  // Generate hourly data for the last 24 hours
  const hourlyData = Array.from({ length: 24 }, (_, i) => {
    const hour = new Date(Date.now() - (23 - i) * 3600000).getHours();
    const hourStart = Date.now() - (23 - i) * 3600000;
    const hourEnd = hourStart + 3600000;

    const hourVotes = votes.filter((v) => v.timestamp >= hourStart && v.timestamp < hourEnd);
    const yesCount = hourVotes.filter((v) => v.choice === "yes").length;
    const noCount = hourVotes.filter((v) => v.choice === "no").length;

    return {
      hour: `${hour}:00`,
      yes: yesCount,
      no: noCount,
      total: yesCount + noCount,
    };
  });

  return (
    <section id="tracker" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-balance">
              The Great Pineapple Debate
            </h2>
            <p className="text-xl text-muted-foreground text-pretty max-w-2xl mx-auto">
              Help us settle the age-old question: does pineapple belong on pizza? Your vote
              contributes to our real-time analytics dashboard.
            </p>
          </div>

          {/* Voting Section */}
          <Card className="mb-8">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Cast Your Vote</CardTitle>
              <CardDescription>
                {userVote
                  ? "Thanks for voting! See the results below."
                  : "What's your stance on pineapple pizza?"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  onClick={() => handleVote("yes")}
                  disabled={!!userVote || isLoading}
                  className={`flex-1 max-w-xs ${userVote === "yes" ? "bg-primary" : ""}`}
                  variant={userVote === "yes" ? "default" : "outline"}
                >
                  <ThumbsUp className="mr-2 h-5 w-5" />
                  {isLoading && userVote !== "yes" ? "Voting..." : "Yes, I love it!"}
                </Button>
                <Button
                  size="lg"
                  onClick={() => handleVote("no")}
                  disabled={!!userVote || isLoading}
                  className={`flex-1 max-w-xs ${userVote === "no" ? "bg-secondary" : ""}`}
                  variant={userVote === "no" ? "secondary" : "outline"}
                >
                  <ThumbsDown className="mr-2 h-5 w-5" />
                  {isLoading && userVote !== "no" ? "Voting..." : "No way!"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Stats Cards */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalVotes}</div>
                <p className="text-xs text-muted-foreground">
                  +{votes.filter((v) => v.timestamp > Date.now() - 86400000).length} in last 24h
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pro-Pineapple</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{yesPercentage.toFixed(1)}%</div>
                <Progress value={yesPercentage} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Anti-Pineapple</CardTitle>
                <TrendingUp className="h-4 w-4 text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-secondary">{noPercentage.toFixed(1)}%</div>
                <Progress value={noPercentage} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Vote Distribution</CardTitle>
                <CardDescription>Overall preference breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    <span className="text-sm">Yes ({yesVotes})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-secondary rounded-full"></div>
                    <span className="text-sm">No ({noVotes})</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Voting Activity (24h)</CardTitle>
                <CardDescription>Hourly vote distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="yes" stackId="a" fill="#d97706" />
                      <Bar dataKey="no" stackId="a" fill="#374151" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Insights */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Analytics Insights</CardTitle>
              <CardDescription>What the data tells us about user preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Badge variant="secondary">User Behavior</Badge>
                  <p className="text-sm text-muted-foreground">
                    {yesPercentage > 50
                      ? "Majority of users prefer pineapple on pizza, showing adventurous taste preferences."
                      : "Most users are traditional pizza lovers, preferring classic toppings."}
                  </p>
                </div>
                <div className="space-y-2">
                  <Badge variant="secondary">Engagement</Badge>
                  <p className="text-sm text-muted-foreground">
                    High participation rate demonstrates effective user engagement strategies and
                    compelling call-to-action design.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
