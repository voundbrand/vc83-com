import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Users, BookOpen, Zap, DollarSign } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-card to-muted overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <Badge
            variant="secondary"
            className="text-sm px-4 py-2 bg-accent/20 text-accent-foreground border-accent/30"
          >
            <Zap className="w-4 h-4 mr-2" />
            AI-Powered Website Building Community
          </Badge>

          {/* Main heading */}
          <h1 className="text-5xl md:text-7xl font-black text-balance leading-tight">
            <span className="font-montserrat">If I Can Do It,</span>
            <br />
            <span className="text-primary font-montserrat">You Can Too</span>
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto text-pretty leading-relaxed">
            Join our community of entrepreneurs learning to build profitable websites with AI tools.
            Get the tutorials, tools, and support you need to start earning online.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
            <Button size="lg" className="text-lg px-8 py-6 bg-primary hover:bg-primary/90">
              Join the Community
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6 bg-transparent">
              Browse Tutorials
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-12">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <div className="text-2xl font-bold text-card-foreground">2,500+</div>
                <div className="text-sm text-muted-foreground">Community Members</div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <BookOpen className="w-8 h-8 text-accent" />
                </div>
                <div className="text-2xl font-bold text-card-foreground">150+</div>
                <div className="text-sm text-muted-foreground">AI Tutorials</div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Zap className="w-8 h-8 text-secondary" />
                </div>
                <div className="text-2xl font-bold text-card-foreground">50+</div>
                <div className="text-sm text-muted-foreground">AI Tools</div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <DollarSign className="w-8 h-8 text-primary" />
                </div>
                <div className="text-2xl font-bold text-card-foreground">$10K+</div>
                <div className="text-sm text-muted-foreground">Avg Monthly Revenue</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
