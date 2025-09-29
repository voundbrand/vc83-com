"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare,
  Users,
  Trophy,
  Calendar,
  ExternalLink,
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
  Zap,
  Star,
  Crown,
} from "lucide-react";

// Mock community data
const communityStats = {
  totalMembers: 2547,
  activeToday: 342,
  messagesThisWeek: 1250,
  helpfulAnswers: 890,
};

const recentActivity = [
  {
    id: 1,
    user: {
      name: "Sarah Chen",
      avatar: "/avatars/sarah.jpg",
      role: "Community Leader",
      badge: "Expert",
    },
    action: "shared a new AI workflow",
    content:
      "Just discovered an amazing Claude prompt that cuts website building time in half! Check it out in #ai-workflows",
    timestamp: "2 hours ago",
    likes: 24,
    replies: 8,
    type: "share",
  },
  {
    id: 2,
    user: {
      name: "Mike Rodriguez",
      avatar: "/avatars/mike.jpg",
      role: "Premium Member",
      badge: "Helper",
    },
    action: "helped a member",
    content:
      "Answered @newbie_dev's question about v0 component styling. The key is understanding the design system tokens!",
    timestamp: "4 hours ago",
    likes: 18,
    replies: 5,
    type: "help",
  },
  {
    id: 3,
    user: {
      name: "Alex Thompson",
      avatar: "/avatars/alex.jpg",
      role: "Success Story",
      badge: "Achiever",
    },
    action: "shared a success story",
    content:
      "Hit $3K MRR this month! Thanks to everyone who helped me optimize my client acquisition process. The templates in #business-tools were game-changers!",
    timestamp: "6 hours ago",
    likes: 45,
    replies: 12,
    type: "success",
  },
  {
    id: 4,
    user: {
      name: "Emma Davis",
      avatar: "/avatars/emma.jpg",
      role: "AI Specialist",
      badge: "Expert",
    },
    action: "started a discussion",
    content:
      "What's everyone's favorite AI tool combo for 2024? I'm currently loving Claude + v0 + Cursor for full-stack development.",
    timestamp: "8 hours ago",
    likes: 32,
    replies: 19,
    type: "discussion",
  },
];

const upcomingEvents = [
  {
    id: 1,
    title: "AI Website Building Workshop",
    description: "Live workshop on building SaaS landing pages with AI tools",
    date: "Dec 15, 2024",
    time: "2:00 PM EST",
    attendees: 156,
    type: "Workshop",
    host: "Sarah Chen",
  },
  {
    id: 2,
    title: "Community Q&A Session",
    description: "Ask anything about AI tools, business, or web development",
    date: "Dec 18, 2024",
    time: "7:00 PM EST",
    attendees: 89,
    type: "Q&A",
    host: "Mike Rodriguez",
  },
  {
    id: 3,
    title: "Success Stories Showcase",
    description: "Members share their wins and lessons learned",
    date: "Dec 22, 2024",
    time: "3:00 PM EST",
    attendees: 203,
    type: "Showcase",
    host: "Alex Thompson",
  },
];

const topContributors = [
  {
    name: "Sarah Chen",
    avatar: "/avatars/sarah.jpg",
    contributions: 245,
    badge: "Community Leader",
    specialty: "AI Workflows",
  },
  {
    name: "Mike Rodriguez",
    avatar: "/avatars/mike.jpg",
    contributions: 189,
    badge: "Helper",
    specialty: "Code Reviews",
  },
  {
    name: "Emma Davis",
    avatar: "/avatars/emma.jpg",
    contributions: 167,
    badge: "AI Expert",
    specialty: "Tool Integration",
  },
  {
    name: "Alex Thompson",
    avatar: "/avatars/alex.jpg",
    contributions: 134,
    badge: "Business Mentor",
    specialty: "Client Success",
  },
];

export function CommunitySection() {
  const [activeTab, setActiveTab] = useState("activity");

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "share":
        return <Share2 className="w-4 h-4 text-blue-500" />;
      case "help":
        return <Heart className="w-4 h-4 text-red-500" />;
      case "success":
        return <Trophy className="w-4 h-4 text-yellow-500" />;
      case "discussion":
        return <MessageCircle className="w-4 h-4 text-green-500" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case "Expert":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "Helper":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Achiever":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <section id="community" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black font-montserrat mb-4">
            Join Our Community
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
            Connect with like-minded entrepreneurs, get help when you need it, and celebrate wins
            together.
          </p>
        </div>

        {/* Community Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <Card className="text-center">
            <CardContent className="p-6">
              <Users className="w-8 h-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-card-foreground">
                {communityStats.totalMembers.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Total Members</div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <TrendingUp className="w-8 h-8 text-accent mx-auto mb-2" />
              <div className="text-2xl font-bold text-card-foreground">
                {communityStats.activeToday}
              </div>
              <div className="text-sm text-muted-foreground">Active Today</div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <MessageSquare className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-card-foreground">
                {communityStats.messagesThisWeek.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Messages This Week</div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <Heart className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-card-foreground">
                {communityStats.helpfulAnswers}
              </div>
              <div className="text-sm text-muted-foreground">Helpful Answers</div>
            </CardContent>
          </Card>
        </div>

        {/* Discord CTA */}
        <div className="text-center mb-12">
          <Card className="max-w-2xl mx-auto bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-200/50">
            <CardContent className="p-8">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center mr-4">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold font-montserrat">Join Our Discord</h3>
                  <p className="text-muted-foreground">
                    Get instant access to our private community
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground mb-6">
                Connect with 2,500+ entrepreneurs, get real-time help, and access exclusive channels
                for premium members.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-indigo-500 hover:bg-indigo-600 text-white">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Join Discord (Free)
                </Button>
                <Button size="lg" variant="outline">
                  Learn More
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Community Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-6xl mx-auto">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            <TabsTrigger value="events">Upcoming Events</TabsTrigger>
            <TabsTrigger value="contributors">Top Contributors</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="mt-8">
            <div className="space-y-6">
              {recentActivity.map((activity) => (
                <Card key={activity.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage
                          src={activity.user.avatar || "/placeholder.svg"}
                          alt={activity.user.name}
                        />
                        <AvatarFallback>
                          {activity.user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-semibold text-card-foreground">
                            {activity.user.name}
                          </span>
                          <Badge className={`text-xs ${getBadgeColor(activity.user.badge)}`}>
                            {activity.user.badge}
                          </Badge>
                          <span className="text-muted-foreground text-sm">{activity.action}</span>
                          <span className="text-muted-foreground text-sm">•</span>
                          <span className="text-muted-foreground text-sm">
                            {activity.timestamp}
                          </span>
                        </div>

                        <p className="text-card-foreground mb-3">{activity.content}</p>

                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <button className="flex items-center space-x-1 hover:text-red-500 transition-colors">
                            <Heart className="w-4 h-4" />
                            <span>{activity.likes}</span>
                          </button>
                          <button className="flex items-center space-x-1 hover:text-blue-500 transition-colors">
                            <MessageCircle className="w-4 h-4" />
                            <span>{activity.replies}</span>
                          </button>
                          <div className="flex items-center space-x-1">
                            {getActivityIcon(activity.type)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="events" className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((event) => (
                <Card key={event.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">{event.type}</Badge>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="w-4 h-4 mr-1" />
                        {event.attendees}
                      </div>
                    </div>
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    <CardDescription>{event.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm">
                        <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span>
                          {event.date} at {event.time}
                        </span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span>Hosted by {event.host}</span>
                      </div>
                    </div>
                    <Button className="w-full">Join Event</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="contributors" className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {topContributors.map((contributor, index) => (
                <Card key={contributor.name} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <Avatar className="w-16 h-16">
                          <AvatarImage
                            src={contributor.avatar || "/placeholder.svg"}
                            alt={contributor.name}
                          />
                          <AvatarFallback>
                            {contributor.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        {index === 0 && (
                          <div className="absolute -top-2 -right-2">
                            <Crown className="w-6 h-6 text-yellow-500" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-semibold text-card-foreground">
                            {contributor.name}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            #{index + 1}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{contributor.badge}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Specialty: {contributor.specialty}
                          </span>
                          <div className="flex items-center space-x-1">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm font-medium">{contributor.contributions}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Community Guidelines */}
        <div className="mt-16 text-center">
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl font-bold font-montserrat">
                Community Guidelines
              </CardTitle>
              <CardDescription>
                Help us maintain a supportive and productive environment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                <div className="flex items-start space-x-3">
                  <Heart className="w-6 h-6 text-red-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-2">Be Helpful</h4>
                    <p className="text-sm text-muted-foreground">
                      Share knowledge, answer questions, and support fellow members on their
                      journey.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Users className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-2">Stay Respectful</h4>
                    <p className="text-sm text-muted-foreground">
                      Treat everyone with respect, regardless of their experience level or
                      background.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Zap className="w-6 h-6 text-yellow-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-2">Share Value</h4>
                    <p className="text-sm text-muted-foreground">
                      Contribute meaningful content, tools, and insights that benefit the community.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
