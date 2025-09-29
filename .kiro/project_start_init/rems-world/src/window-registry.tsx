"use client";

import React from "react";
import { AboutApplication } from "@/components/applications/about-application";
import { ThemePicker } from "@/components/applications/theme-picker";
import { CalendarApplication } from "@/components/applications/calendar-application";
import { CalendarBookingRetro } from "@/components/applications/calendar-booking-retro";
import { CalendarBookingDirect } from "@/components/applications/calendar-booking-direct";

// Page component props interface
export interface PageComponentProps {
  windowId: string;
}

// Projects Page Component
export function ProjectsPage({}: PageComponentProps) {
  const projects = [
    { id: 1, name: "Neural Network Visualizer", tech: "Python, TensorFlow", year: "2024" },
    { id: 2, name: "Retro Game Engine", tech: "C++, OpenGL", year: "2023" },
    { id: 3, name: "Distributed Computing Platform", tech: "Rust, WebAssembly", year: "2023" },
    { id: 4, name: "Quantum Circuit Simulator", tech: "Julia, Quantum SDK", year: "2022" },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-accent neon-glow">Projects Archive</h1>

      <div className="space-y-4">
        {projects.map((project) => (
          <div key={project.id} className="feature-card">
            <h3 className="font-semibold text-primary mb-1">{project.name}</h3>
            <div className="text-xs text-secondary">
              <span>{project.tech}</span>
              <span className="float-right">{project.year}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-xs text-secondary">
        <p>Total Projects: {projects.length}</p>
        <p>Last Updated: {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
}

// Contact Page Component
export function ContactPage({}: PageComponentProps) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-accent neon-glow">Contact Terminal</h1>

      <div className="bg-dark p-4 font-mono text-xs border border-accent">
        <div className="text-accent mb-2">$ contact --list</div>
        <div className="space-y-1 text-primary">
          <div>EMAIL: rem@retro-world.net</div>
          <div>GITHUB: github.com/rem-world</div>
          <div>DISCORD: RemWorld#1984</div>
          <div>IRC: #rem-world @ freenode</div>
        </div>
        <div className="mt-4 text-accent">
          $ <span className="terminal-cursor"></span>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <button className="btn btn-primary w-full">SEND MESSAGE</button>
        <button className="btn btn-secondary w-full">REQUEST ACCESS</button>
      </div>
    </div>
  );
}

// Skills Page Component
export function SkillsPage({}: PageComponentProps) {
  const skills = {
    Programming: ["JavaScript/TypeScript", "Python", "Rust", "C++"],
    Technologies: ["React/Next.js", "Node.js", "WebAssembly", "Machine Learning"],
    Tools: ["Git", "Docker", "Kubernetes", "CI/CD"],
    Databases: ["PostgreSQL", "Redis", "MongoDB", "GraphQL"],
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-accent neon-glow">Technical Skills</h1>

      <div className="space-y-6">
        {Object.entries(skills).map(([category, items]) => (
          <div key={category}>
            <h2 className="text-lg font-semibold mb-3 text-primary">{category}</h2>
            <div className="grid grid-cols-2 gap-2">
              {items.map((skill) => (
                <div key={skill} className="text-sm p-2 border border-primary bg-secondary">
                  {skill}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Terminal Page Component
export function TerminalPage({}: PageComponentProps) {
  const [history, setHistory] = React.useState<string[]>([
    "RemOS Terminal v1.0",
    'Type "help" for available commands',
    "",
  ]);
  const [input, setInput] = React.useState("");

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newHistory = [...history, `$ ${input}`];

    // Simple command handling
    switch (input.toLowerCase()) {
      case "help":
        newHistory.push(
          "Available commands:",
          "help - Show this message",
          "clear - Clear terminal",
          "about - System information",
          "date - Current date/time",
        );
        break;
      case "clear":
        setHistory(["RemOS Terminal v1.0", ""]);
        setInput("");
        return;
      case "about":
        newHistory.push(
          "RemOS v1.0 - A retro computing experience",
          "Built with React and TypeScript",
        );
        break;
      case "date":
        newHistory.push(new Date().toString());
        break;
      default:
        newHistory.push(`Command not found: ${input}`);
    }

    newHistory.push("");
    setHistory(newHistory);
    setInput("");
  };

  return (
    <div className="h-full bg-dark p-4 font-mono text-xs">
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto">
          {history.map((line, i) => (
            <div key={i} className="text-primary">
              {line}
            </div>
          ))}
        </div>
        <form onSubmit={handleCommand} className="flex items-center text-accent">
          <span>$ </span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-transparent outline-none ml-2"
            autoFocus
          />
          <span className="terminal-cursor"></span>
        </form>
      </div>
    </div>
  );
}

// Registry type definition
export interface WindowRegistryEntry {
  component: React.ComponentType<PageComponentProps>;
  title: string;
  defaultSize: { width: number; height: number };
  icon: string; // Will be removed later when we update to use SVG icons
  iconComponent?: React.ComponentType<{ className?: string }>; // New SVG icon component
}

// Window Registry
export const windowRegistry: Record<string, WindowRegistryEntry> = {
  about: {
    component: AboutApplication,
    title: "About Me",
    defaultSize: { width: 1000, height: 600 },
    icon: "👤",
  },
  projects: {
    component: ProjectsPage,
    title: "Projects",
    defaultSize: { width: 700, height: 500 },
    icon: "💻",
  },
  contact: {
    component: ContactPage,
    title: "Contact",
    defaultSize: { width: 500, height: 400 },
    icon: "📧",
  },
  skills: {
    component: SkillsPage,
    title: "Skills",
    defaultSize: { width: 600, height: 500 },
    icon: "🎯",
  },
  terminal: {
    component: TerminalPage,
    title: "Terminal",
    defaultSize: { width: 800, height: 400 },
    icon: "💻",
  },
  "theme-picker": {
    component: ThemePicker,
    title: "Theme",
    defaultSize: { width: 700, height: 720 },
    icon: "🎨",
  },
  calendar: {
    component: CalendarApplication,
    title: "Calendar",
    defaultSize: { width: 600, height: 600 },
    icon: "📅",
  },
  "calendar-pro": {
    component: CalendarBookingRetro,
    title: "Calendar",
    defaultSize: { width: 900, height: 700 },
    icon: "📆",
  },
};

// Helper function to get registry entry
export function getWindowRegistryEntry(pageId: string): WindowRegistryEntry | undefined {
  return windowRegistry[pageId];
}

// Legacy default export for compatibility
const registry: Record<string, React.FC<PageComponentProps>> = Object.entries(
  windowRegistry,
).reduce((acc, [key, entry]) => ({ ...acc, [key]: entry.component }), {});

export default registry;
