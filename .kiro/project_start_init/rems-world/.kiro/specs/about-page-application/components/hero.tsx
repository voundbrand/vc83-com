"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, Users, Zap } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import Link from "next/link";
import { CalButton } from "@/components/cal-button";

export function Hero() {
  const { t } = useLanguage();

  return (
    <section className="py-20 lg:py-32 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-balance mb-6">
            {t("hero.title")} <span className="text-primary">{t("hero.subtitle")}</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 text-pretty max-w-2xl mx-auto">
            {t("hero.description")}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              asChild
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Link href="/pizza-tracker">
                {t("hero.cta.tryTracker")} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <CalButton variant="outline" size="lg">
              {t("hero.cta.scheduleCall")}
            </CalButton>
            <Button
              variant="outline"
              size="lg"
              onClick={() =>
                document.getElementById("resume")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              {t("hero.cta.resume")}
            </Button>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{t("hero.features.analytics.title")}</h3>
              <p className="text-muted-foreground text-sm">
                {t("hero.features.analytics.description")}
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{t("hero.features.testing.title")}</h3>
              <p className="text-muted-foreground text-sm">
                {t("hero.features.testing.description")}
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{t("hero.features.insights.title")}</h3>
              <p className="text-muted-foreground text-sm">
                {t("hero.features.insights.description")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
