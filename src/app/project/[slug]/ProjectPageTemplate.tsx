"use client";

import { useEffect } from "react";
import SimpleTemplate from "./templates/SimpleTemplate";
import ProposalTemplate from "./templates/ProposalTemplate";
import RikschaTemplate from "./templates/RikschaTemplate";
import GerritTemplate from "./templates/GerritTemplate";

interface ProjectPageConfig {
  projectId: string;
  organizationId: string;
  name: string;
  description?: string;
  theme: string;
  template: string;
  logoUrl?: string;
  faviconUrl?: string;
  customCss?: string;
}

interface ProjectPageTemplateProps {
  config: ProjectPageConfig;
  slug: string;
}

export default function ProjectPageTemplate({
  config,
  slug,
}: ProjectPageTemplateProps) {
  // Apply custom CSS if provided
  useEffect(() => {
    if (config.customCss) {
      const style = document.createElement("style");
      style.id = `project-custom-css-${slug}`;
      style.textContent = config.customCss;
      document.head.appendChild(style);
      return () => {
        const existingStyle = document.getElementById(`project-custom-css-${slug}`);
        if (existingStyle) {
          existingStyle.remove();
        }
      };
    }
  }, [config.customCss, slug]);

  // Apply custom favicon if provided
  useEffect(() => {
    if (config.faviconUrl) {
      const existingFavicon = document.querySelector("link[rel='icon']");
      const favicon = document.createElement("link");
      favicon.rel = "icon";
      favicon.href = config.faviconUrl;

      if (existingFavicon) {
        existingFavicon.remove();
      }
      document.head.appendChild(favicon);
    }
  }, [config.faviconUrl]);

  // Update page title
  useEffect(() => {
    document.title = config.name;
  }, [config.name]);

  // Select template based on config
  switch (config.template) {
    case "proposal":
      return <ProposalTemplate config={config} slug={slug} />;
    case "rikscha":
      return <RikschaTemplate config={config} slug={slug} />;
    case "gerrit":
      return <GerritTemplate config={config} slug={slug} />;
    case "simple":
    default:
      return <SimpleTemplate config={config} slug={slug} />;
  }
}
