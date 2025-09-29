"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  ExternalLink,
  FileText,
  Palette,
  Code,
  DollarSign,
  Users,
  Zap,
  CheckCircle,
  Star,
  Package,
  Briefcase,
  Target,
  TrendingUp,
  Clock,
  Globe,
} from "lucide-react";

// Mock data for agency tools
const websitePackages = [
  {
    id: 1,
    name: "SaaS Starter Kit",
    description: "Complete SaaS landing page with pricing, features, and testimonials",
    price: "$2,500 - $5,000",
    timeToDeliver: "3-5 days",
    difficulty: "Beginner",
    includes: ["Landing Page", "Pricing Page", "About Page", "Contact Form", "Mobile Responsive"],
    preview: "/packages/saas-starter.jpg",
    downloads: 1250,
    rating: 4.9,
    category: "SaaS",
  },
  {
    id: 2,
    name: "E-commerce Pro",
    description: "Full e-commerce solution with product catalog and checkout",
    price: "$5,000 - $10,000",
    timeToDeliver: "7-10 days",
    difficulty: "Intermediate",
    includes: ["Product Catalog", "Shopping Cart", "Checkout", "User Accounts", "Admin Dashboard"],
    preview: "/packages/ecommerce-pro.jpg",
    downloads: 890,
    rating: 4.8,
    category: "E-commerce",
  },
  {
    id: 3,
    name: "Local Business Bundle",
    description: "Perfect for restaurants, salons, and service businesses",
    price: "$1,500 - $3,000",
    timeToDeliver: "2-4 days",
    difficulty: "Beginner",
    includes: ["Homepage", "Services Page", "Gallery", "Contact & Location", "Booking System"],
    preview: "/packages/local-business.jpg",
    downloads: 2100,
    rating: 4.7,
    category: "Local Business",
  },
  {
    id: 4,
    name: "Portfolio Professional",
    description: "Stunning portfolio sites for creatives and professionals",
    price: "$1,000 - $2,500",
    timeToDeliver: "1-3 days",
    difficulty: "Beginner",
    includes: ["Portfolio Gallery", "About Page", "Contact Form", "Blog", "SEO Optimized"],
    preview: "/packages/portfolio-pro.jpg",
    downloads: 1680,
    rating: 4.8,
    category: "Portfolio",
  },
];

const businessTools = [
  {
    id: 1,
    name: "Client Proposal Template",
    description: "Professional proposal template with pricing calculator",
    type: "Template",
    format: "PDF + Figma",
    downloads: 3200,
    rating: 4.9,
    icon: <FileText className="w-6 h-6" />,
  },
  {
    id: 2,
    name: "Website Audit Checklist",
    description: "Comprehensive checklist to audit client websites",
    type: "Checklist",
    format: "PDF + Notion",
    downloads: 2800,
    rating: 4.8,
    icon: <CheckCircle className="w-6 h-6" />,
  },
  {
    id: 3,
    name: "Pricing Calculator",
    description: "Interactive tool to calculate project pricing",
    type: "Tool",
    format: "Web App",
    downloads: 1900,
    rating: 4.7,
    icon: <DollarSign className="w-6 h-6" />,
  },
  {
    id: 4,
    name: "Client Onboarding Kit",
    description: "Complete onboarding process for new clients",
    type: "Kit",
    format: "Templates + Forms",
    downloads: 2400,
    rating: 4.9,
    icon: <Users className="w-6 h-6" />,
  },
];

const aiWorkflows = [
  {
    id: 1,
    name: "Claude Website Builder Prompt",
    description: "Optimized prompt for building complete websites with Claude",
    category: "Prompts",
    effectiveness: 95,
    timesSaved: "80%",
    icon: <Code className="w-6 h-6" />,
  },
  {
    id: 2,
    name: "v0 Component Generator",
    description: "Workflow for creating custom components with v0",
    category: "Workflow",
    effectiveness: 92,
    timesSaved: "70%",
    icon: <Zap className="w-6 h-6" />,
  },
  {
    id: 3,
    name: "Design System Creator",
    description: "AI-powered design system generation workflow",
    category: "Design",
    effectiveness: 88,
    timesSaved: "60%",
    icon: <Palette className="w-6 h-6" />,
  },
  {
    id: 4,
    name: "Content Generation Pipeline",
    description: "Automated content creation for websites",
    category: "Content",
    effectiveness: 90,
    timesSaved: "75%",
    icon: <FileText className="w-6 h-6" />,
  },
];

const successMetrics = {
  totalPackagesSold: 15600,
  averageProjectValue: 3200,
  memberSuccess: 89,
  timeReduction: 75,
};

export function AgencyTools() {
  const [activeTab, setActiveTab] = useState("packages");

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner":
        return "bg-green-100 text-green-800 border-green-200";
      case "Intermediate":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Advanced":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <section id="tools" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black font-montserrat mb-4">Agency Tools</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
            Everything you need to start and scale your AI-powered web development agency. Pre-made
            packages, templates, and workflows.
          </p>
        </div>

        {/* Success Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <Card className="text-center">
            <CardContent className="p-6">
              <Package className="w-8 h-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-card-foreground">
                {successMetrics.totalPackagesSold.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Packages Sold</div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <DollarSign className="w-8 h-8 text-accent mx-auto mb-2" />
              <div className="text-2xl font-bold text-card-foreground">
                ${successMetrics.averageProjectValue.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Avg Project Value</div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-card-foreground">
                {successMetrics.memberSuccess}%
              </div>
              <div className="text-sm text-muted-foreground">Member Success Rate</div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <Clock className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-card-foreground">
                {successMetrics.timeReduction}%
              </div>
              <div className="text-sm text-muted-foreground">Time Reduction</div>
            </CardContent>
          </Card>
        </div>

        {/* Tools Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-6xl mx-auto">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="packages">Website Packages</TabsTrigger>
            <TabsTrigger value="business">Business Tools</TabsTrigger>
            <TabsTrigger value="workflows">AI Workflows</TabsTrigger>
          </TabsList>

          <TabsContent value="packages" className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {websitePackages.map((pkg) => (
                <Card key={pkg.id} className="group hover:shadow-lg transition-all duration-300">
                  <div className="relative overflow-hidden rounded-t-lg">
                    <img
                      src={pkg.preview || "/placeholder.svg"}
                      alt={pkg.name}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-4 left-4">
                      <Badge className={`${getDifficultyColor(pkg.difficulty)} border`}>
                        {pkg.difficulty}
                      </Badge>
                    </div>
                    <div className="absolute top-4 right-4">
                      <Badge variant="secondary" className="bg-background/90 text-foreground">
                        {pkg.category}
                      </Badge>
                    </div>
                  </div>

                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <CardTitle className="text-xl">{pkg.name}</CardTitle>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{pkg.rating}</span>
                      </div>
                    </div>
                    <CardDescription>{pkg.description}</CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <DollarSign className="w-4 h-4 mr-1 text-green-500" />
                            <span className="font-medium">{pkg.price}</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1 text-blue-500" />
                            <span>{pkg.timeToDeliver}</span>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Download className="w-4 h-4 mr-1 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {pkg.downloads.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2 text-sm">Includes:</h4>
                        <div className="flex flex-wrap gap-1">
                          {pkg.includes.map((item) => (
                            <Badge key={item} variant="outline" className="text-xs">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button className="flex-1">
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                        <Button variant="outline">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Preview
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="business" className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {businessTools.map((tool) => (
                <Card key={tool.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-primary/10 rounded-lg">{tool.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-lg">{tool.name}</h3>
                          <div className="flex items-center space-x-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm">{tool.rating}</span>
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-3">{tool.description}</p>
                        <div className="flex items-center justify-between text-sm mb-4">
                          <Badge variant="outline">{tool.type}</Badge>
                          <span className="text-muted-foreground">{tool.format}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {tool.downloads.toLocaleString()} downloads
                          </span>
                          <Button size="sm">
                            <Download className="w-4 h-4 mr-2" />
                            Get Tool
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="workflows" className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {aiWorkflows.map((workflow) => (
                <Card key={workflow.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-accent/10 rounded-lg">{workflow.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-lg">{workflow.name}</h3>
                          <Badge variant="outline">{workflow.category}</Badge>
                        </div>
                        <p className="text-muted-foreground mb-4">{workflow.description}</p>

                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span>Effectiveness</span>
                              <span className="font-medium">{workflow.effectiveness}%</span>
                            </div>
                            <Progress value={workflow.effectiveness} className="h-2" />
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Saves {workflow.timesSaved} time
                            </span>
                            <Button size="sm">
                              <Download className="w-4 h-4 mr-2" />
                              Get Workflow
                            </Button>
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

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <Card className="max-w-4xl mx-auto bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <CardContent className="p-8">
              <Briefcase className="w-16 h-16 text-primary mx-auto mb-4" />
              <h3 className="text-3xl font-bold font-montserrat mb-4">
                Ready to Start Your Agency?
              </h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Get access to all our agency tools, templates, and workflows. Join hundreds of
                successful members who are building profitable web development businesses.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-primary hover:bg-primary/90">
                  <Target className="w-4 h-4 mr-2" />
                  Start Your Agency
                </Button>
                <Button size="lg" variant="outline">
                  <Globe className="w-4 h-4 mr-2" />
                  View Success Stories
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
