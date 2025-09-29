"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

export function LocationMap() {
  const { t } = useLanguage();

  // Pasewalk, Germany coordinates
  const location = "Pasewalk,+Germany";
  const coordinates = "53.5053,13.9886"; // Pasewalk coordinates

  return (
    <div className="mt-8">
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {t("bio.location.title") || "Location"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <iframe
            src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d20000!2d13.9886!3d53.5053!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47aa7d7c5f9f7d93%3A0x421b1cb4288a3d0!2sPasewalk%2C%20Germany!5e0!3m2!1sen!2sus!4v${Date.now()}`}
            width="100%"
            height="400"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="w-full"
          />
        </CardContent>
      </Card>
    </div>
  );
}
