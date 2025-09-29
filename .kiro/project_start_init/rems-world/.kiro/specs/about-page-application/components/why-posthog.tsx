"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Users, TrendingUp } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

const iconMap = {
  0: Heart,
  1: Users,
  2: TrendingUp,
};

export function WhyPostHog() {
  const { t } = useLanguage();

  return (
    <section className="py-20 bg-muted/30" id="why-posthog">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              {t("resume.whyPostHog.badge")}
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-primary">
              {t("resume.whyPostHog.title")}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto whitespace-pre-line">
              {t("resume.whyPostHog.intro")}
            </p>
          </div>

          {/* Reasons Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {t("resume.whyPostHog.reasons").map((reason: any, idx: number) => {
              const IconComponent = iconMap[idx as keyof typeof iconMap] || Heart;

              return (
                <Card
                  key={idx}
                  className="group hover:shadow-lg transition-shadow duration-300 border-primary/10 hover:border-primary/30"
                >
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                        <IconComponent className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{reason.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{reason.content}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Closing Statement */}
          <div className="bg-primary/5 rounded-lg p-8 text-center">
            <p className="text-lg font-medium mb-4">{t("resume.whyPostHog.closing")}</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Badge variant="secondary" className="text-sm">
                Product Analytics
              </Badge>
              <Badge variant="secondary" className="text-sm">
                A/B Testing
              </Badge>
              <Badge variant="secondary" className="text-sm">
                Customer Success
              </Badge>
              <Badge variant="secondary" className="text-sm">
                Open Source
              </Badge>
              <Badge variant="secondary" className="text-sm">
                Developer Tools
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
