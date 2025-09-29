"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  Users,
  Star,
  Search,
  Filter,
  Play,
  BookOpen,
  Zap,
  Code,
  DollarSign,
} from "lucide-react";

// Mock tutorial data
const tutorials = [
  {
    id: 1,
    title: "Build Your First AI Website with v0",
    description:
      "Learn how to create a professional website using v0 and AI prompts in under 30 minutes.",
    category: "Beginner",
    difficulty: "Easy",
    duration: "25 min",
    students: 1250,
    rating: 4.8,
    thumbnail: "/ai-website-building-tutorial.jpg",
    tags: ["v0", "AI", "Website", "Beginner"],
    instructor: "Sarah Chen",
    price: "Free",
  },
  {
    id: 2,
    title: "Claude Prompting Mastery for Web Development",
    description:
      "Master the art of prompting Claude to generate clean, production-ready code for your projects.",
    category: "Intermediate",
    difficulty: "Medium",
    duration: "45 min",
    students: 890,
    rating: 4.9,
    thumbnail: "/claude-ai-prompting-tutorial.jpg",
    tags: ["Claude", "Prompting", "Code", "AI"],
    instructor: "Mike Rodriguez",
    price: "Premium",
  },
  {
    id: 3,
    title: "Selling Websites: From $0 to $5K/Month",
    description:
      "Complete guide to finding clients, pricing your services, and scaling your web development business.",
    category: "Business",
    difficulty: "Medium",
    duration: "60 min",
    students: 2100,
    rating: 4.7,
    thumbnail: "/website-business-tutorial.jpg",
    tags: ["Business", "Sales", "Pricing", "Clients"],
    instructor: "Alex Thompson",
    price: "Premium",
  },
  {
    id: 4,
    title: "AI Tools Workflow: 10x Your Productivity",
    description:
      "Learn the exact workflow and tools I use to build websites 10x faster with AI assistance.",
    category: "Advanced",
    difficulty: "Hard",
    duration: "90 min",
    students: 650,
    rating: 4.9,
    thumbnail: "/ai-productivity-workflow.jpg",
    tags: ["Workflow", "Productivity", "AI Tools", "Advanced"],
    instructor: "Emma Davis",
    price: "Premium",
  },
  {
    id: 5,
    title: "Stripe Integration for Beginners",
    description:
      "Add payment processing to your websites with Stripe. Complete setup and implementation guide.",
    category: "Intermediate",
    difficulty: "Medium",
    duration: "40 min",
    students: 780,
    rating: 4.6,
    thumbnail: "/stripe-payment-integration.jpg",
    tags: ["Stripe", "Payments", "Integration", "E-commerce"],
    instructor: "David Kim",
    price: "Free",
  },
  {
    id: 6,
    title: "Building SaaS Landing Pages That Convert",
    description:
      "Design and build high-converting SaaS landing pages using proven templates and AI tools.",
    category: "Intermediate",
    difficulty: "Medium",
    duration: "55 min",
    students: 1450,
    rating: 4.8,
    thumbnail: "/saas-landing-page-design.jpg",
    tags: ["SaaS", "Landing Page", "Conversion", "Design"],
    instructor: "Lisa Wang",
    price: "Premium",
  },
];

const categories = ["All", "Beginner", "Intermediate", "Advanced", "Business"];
const difficulties = ["All", "Easy", "Medium", "Hard"];

export function TutorialLibrary() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState("All");

  const filteredTutorials = tutorials.filter((tutorial) => {
    const matchesSearch =
      tutorial.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tutorial.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tutorial.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === "All" || tutorial.category === selectedCategory;
    const matchesDifficulty =
      selectedDifficulty === "All" || tutorial.difficulty === selectedDifficulty;

    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const getDifficultyIcon = (category: string) => {
    switch (category) {
      case "Beginner":
        return <BookOpen className="w-4 h-4" />;
      case "Intermediate":
        return <Code className="w-4 h-4" />;
      case "Advanced":
        return <Zap className="w-4 h-4" />;
      case "Business":
        return <DollarSign className="w-4 h-4" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-100 text-green-800 border-green-200";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Hard":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <section id="tutorials" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black font-montserrat mb-4">Tutorial Library</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
            Learn from our comprehensive collection of AI website building tutorials. From beginner
            basics to advanced techniques.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 max-w-4xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search tutorials, topics, or tools..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              {difficulties.map((difficulty) => (
                <SelectItem key={difficulty} value={difficulty}>
                  {difficulty}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        <div className="text-center mb-8">
          <p className="text-muted-foreground">
            Showing {filteredTutorials.length} of {tutorials.length} tutorials
          </p>
        </div>

        {/* Tutorial Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTutorials.map((tutorial) => (
            <Card
              key={tutorial.id}
              className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20"
            >
              <div className="relative overflow-hidden rounded-t-lg">
                <img
                  src={tutorial.thumbnail || "/placeholder.svg"}
                  alt={tutorial.title}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-4 left-4">
                  <Badge className={`${getDifficultyColor(tutorial.difficulty)} border`}>
                    {getDifficultyIcon(tutorial.category)}
                    <span className="ml-1">{tutorial.category}</span>
                  </Badge>
                </div>
                <div className="absolute top-4 right-4">
                  {tutorial.price === "Free" ? (
                    <Badge variant="secondary" className="bg-accent text-accent-foreground">
                      Free
                    </Badge>
                  ) : (
                    <Badge variant="default" className="bg-primary text-primary-foreground">
                      Premium
                    </Badge>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                  <Button
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Watch Now
                  </Button>
                </div>
              </div>

              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold line-clamp-2 group-hover:text-primary transition-colors">
                  {tutorial.title}
                </CardTitle>
                <CardDescription className="line-clamp-2">{tutorial.description}</CardDescription>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {tutorial.duration}
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {tutorial.students.toLocaleString()}
                    </div>
                    <div className="flex items-center">
                      <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
                      {tutorial.rating}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {tutorial.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {tutorial.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{tutorial.tags.length - 3}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">by {tutorial.instructor}</span>
                  <Button size="sm" variant="outline">
                    Start Learning
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* No results */}
        {filteredTutorials.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No tutorials found</h3>
            <p className="text-muted-foreground mb-4">Try adjusting your search terms or filters</p>
            <Button
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("All");
                setSelectedDifficulty("All");
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}

        {/* CTA Section */}
        <div className="text-center mt-16">
          <Card className="max-w-2xl mx-auto bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold font-montserrat mb-4">Want More Tutorials?</h3>
              <p className="text-muted-foreground mb-6">
                Join our premium community to access exclusive tutorials, live workshops, and 1-on-1
                support.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-primary hover:bg-primary/90">
                  Upgrade to Premium
                </Button>
                <Button size="lg" variant="outline">
                  Request Tutorial
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
