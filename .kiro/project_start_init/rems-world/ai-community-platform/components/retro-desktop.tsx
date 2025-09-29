"use client";

import type React from "react";

import type { ReactNode } from "react";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Briefcase,
  Calendar,
  Star,
  Play,
  Download,
  ExternalLink,
  FileText,
  Info,
} from "lucide-react";

interface DesktopIcon {
  id: string;
  name: string;
  icon: ReactNode;
  position: { x: number; y: number };
  onClick: () => void;
}

interface Window {
  id: string;
  title: string;
  content: ReactNode;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isMinimized: boolean;
  zIndex: number; // Added zIndex for window stacking
}

export function RetroDesktop() {
  const [openWindows, setOpenWindows] = useState<Window[]>([]);
  const [activeWindow, setActiveWindow] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    windowId: string | null;
    offset: { x: number; y: number };
  }>({
    isDragging: false,
    windowId: null,
    offset: { x: 0, y: 0 },
  }); // Added drag state management
  const [nextZIndex, setNextZIndex] = useState(100); // Track highest z-index

  const openWindow = (window: Omit<Window, "isMinimized" | "zIndex">) => {
    const existingWindow = openWindows.find((w) => w.id === window.id);
    if (existingWindow) {
      setActiveWindow(window.id);
      setOpenWindows((prev) =>
        prev.map((w) => (w.id === window.id ? { ...w, zIndex: nextZIndex } : w)),
      );
      setNextZIndex((prev) => prev + 1);
      return;
    }

    setOpenWindows((prev) => [...prev, { ...window, isMinimized: false, zIndex: nextZIndex }]);
    setActiveWindow(window.id);
    setNextZIndex((prev) => prev + 1);
  };

  const closeWindow = (id: string) => {
    setOpenWindows((prev) => prev.filter((w) => w.id !== id));
    setActiveWindow(null);
  };

  const minimizeWindow = (id: string) => {
    setOpenWindows((prev) => prev.map((w) => (w.id === id ? { ...w, isMinimized: true } : w)));
    setActiveWindow(null);
  };

  const restoreWindow = (id: string) => {
    setOpenWindows((prev) => prev.map((w) => (w.id === id ? { ...w, isMinimized: false } : w)));
    setActiveWindow(id);
  };

  const desktopIcons: DesktopIcon[] = [
    {
      id: "tutorials",
      name: "Learning.mdx",
      icon: <FileText className="w-12 h-12 text-blue-600" strokeWidth={1.5} />,
      position: { x: 60, y: 160 },
      onClick: () =>
        openWindow({
          id: "tutorials",
          title: "Learning.mdx",
          position: { x: 100, y: 100 },
          size: { width: 800, height: 600 },
          content: <TutorialWindow />,
        }),
    },
    {
      id: "community",
      name: "Community",
      icon: <Users className="w-12 h-12 text-green-600" strokeWidth={1.5} />,
      position: { x: 60, y: 260 },
      onClick: () =>
        openWindow({
          id: "community",
          title: "Community",
          position: { x: 150, y: 150 },
          size: { width: 900, height: 650 },
          content: <CommunityWindow />,
        }),
    },
    {
      id: "agency",
      name: "Agency Tools",
      icon: <Briefcase className="w-12 h-12 text-purple-600" strokeWidth={1.5} />,
      position: { x: 60, y: 360 },
      onClick: () =>
        openWindow({
          id: "agency",
          title: "Agency Tools",
          position: { x: 200, y: 200 },
          size: { width: 900, height: 650 },
          content: <AgencyWindow />,
        }),
    },
    {
      id: "booking",
      name: "Book Support",
      icon: <Calendar className="w-12 h-12 text-red-600" strokeWidth={1.5} />,
      position: { x: 60, y: 460 },
      onClick: () =>
        openWindow({
          id: "booking",
          title: "Book Support",
          position: { x: 250, y: 250 },
          size: { width: 600, height: 400 },
          content: <BookingWindow />,
        }),
    },
    {
      id: "about",
      name: "About.txt",
      icon: <Info className="w-12 h-12 text-orange-600" strokeWidth={1.5} />,
      position: { x: 60, y: 560 },
      onClick: () =>
        openWindow({
          id: "about",
          title: "About.txt",
          position: { x: 300, y: 300 },
          size: { width: 500, height: 400 },
          content: <AboutWindow />,
        }),
    },
  ];

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, windowId: string, windowPosition: { x: number; y: number }) => {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      setDragState({
        isDragging: true,
        windowId,
        offset: {
          x: e.clientX - windowPosition.x,
          y: e.clientY - windowPosition.y,
        },
      });
      setActiveWindow(windowId);

      // Bring window to front
      setOpenWindows((prev) =>
        prev.map((w) => (w.id === windowId ? { ...w, zIndex: nextZIndex } : w)),
      );
      setNextZIndex((prev) => prev + 1);
    },
    [nextZIndex],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragState.isDragging || !dragState.windowId) return;

      const newX = Math.max(0, Math.min(window.innerWidth - 200, e.clientX - dragState.offset.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragState.offset.y));

      setOpenWindows((prev) =>
        prev.map((w) =>
          w.id === dragState.windowId ? { ...w, position: { x: newX, y: newY } } : w,
        ),
      );
    },
    [dragState],
  );

  const handleMouseUp = useCallback(() => {
    setDragState({
      isDragging: false,
      windowId: null,
      offset: { x: 0, y: 0 },
    });
  }, []);

  const React = window.React; // Added to avoid redeclaration error

  React.useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [dragState.isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      className="min-h-screen relative overflow-hidden font-retro"
      style={{
        background: `
          linear-gradient(135deg, #f5f1e8 0%, #e8dcc0 100%),
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(139,69,19,0.03) 2px,
            rgba(139,69,19,0.03) 4px
          ),
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 2px,
            rgba(139,69,19,0.03) 2px,
            rgba(139,69,19,0.03) 4px
          )
        `,
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-12 bg-white border-b-2 border-gray-800 flex items-center px-6 shadow-sm z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-orange-500 border-2 border-gray-800"></div>
            <span className="font-bold text-gray-800 font-retro">AI Community</span>
          </div>
          <nav className="flex items-center gap-6">
            <a href="#" className="text-sm text-gray-700 hover:text-gray-900 font-retro">
              Product OS
            </a>
            <a href="#" className="text-sm text-gray-700 hover:text-gray-900 font-retro">
              Pricing
            </a>
            <a href="#" className="text-sm text-gray-700 hover:text-gray-900 font-retro">
              Docs
            </a>
            <a href="#" className="text-sm text-gray-700 hover:text-gray-900 font-retro">
              Library
            </a>
            <a href="#" className="text-sm text-gray-700 hover:text-gray-900 font-retro">
              Company
            </a>
            <a href="#" className="text-sm text-gray-700 hover:text-gray-900 font-retro">
              More
            </a>
          </nav>
        </div>
        <div className="ml-auto">
          <Button
            size="sm"
            className="font-retro bg-orange-500 hover:bg-orange-600 text-white border-2 border-gray-800"
          >
            Dashboard
          </Button>
        </div>
      </div>

      {/* Central content area - document style */}
      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-80 bg-white border-2 border-gray-800 shadow-lg font-retro mt-6">
        <div
          className="bg-gray-200 px-4 py-2 border-b-2 border-gray-800 flex items-center justify-between h-6"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.1) 1px, rgba(0,0,0,0.1) 2px)",
          }}
        >
          <span className="text-xs font-bold text-gray-800 font-retro">home.mdx</span>
          <button
            className="w-4 h-4 bg-white border-2 border-gray-800 text-xs font-bold text-gray-800 hover:bg-gray-100 flex items-center justify-center font-retro"
            style={{ fontSize: "8px" }}
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-orange-500 border-2 border-gray-800"></div>
            <h1 className="text-lg font-bold text-gray-800 font-retro-title">AI Community</h1>
          </div>

          <p className="text-gray-700 mb-6 leading-relaxed font-retro">
            We're building every tool for AI enthusiasts to build successful websites and
            communities.
          </p>

          <div className="space-y-3">
            <Button className="w-full font-retro bg-orange-500 hover:bg-orange-600 text-white border-2 border-gray-800">
              Get started - free
            </Button>
            <Button
              variant="outline"
              className="w-full font-retro bg-white hover:bg-gray-50 text-gray-800 border-2 border-gray-800"
            >
              Join with AI
            </Button>
          </div>

          <p className="text-sm text-gray-600 mt-4 font-retro">
            Questions?{" "}
            <a href="#" className="text-gray-800 underline">
              Watch a demo
            </a>{" "}
            or{" "}
            <a href="#" className="text-gray-800 underline">
              talk to a human
            </a>
            .
          </p>
        </div>
      </div>
      {/* Desktop icons */}
      {desktopIcons.map((icon) => (
        <div
          key={icon.id}
          className="absolute cursor-pointer group select-none"
          style={{ left: icon.position.x, top: icon.position.y }}
          onClick={icon.onClick}
        >
          <div className="flex flex-col items-center p-2 hover:bg-white/20 transition-all duration-200 rounded">
            <div className="group-hover:scale-105 transition-transform duration-200">
              {icon.icon}
            </div>
            <span className="text-xs mt-1 text-gray-800 max-w-20 text-center leading-tight bg-white px-1 border border-gray-800 shadow-sm font-retro">
              {icon.name}
            </span>
          </div>
        </div>
      ))}
      {/* Right side illustration area placeholder */}
      <div className="absolute right-8 top-1/2 transform -translate-y-1/2 w-80 h-80 bg-white border-2 border-gray-800 shadow-lg flex items-center justify-center mt-6">
        <div className="text-center text-gray-700">
          <div className="w-16 h-16 bg-yellow-100 border-2 border-gray-800 mx-auto mb-4 flex items-center justify-center">
            <Star className="w-8 h-8 text-yellow-600" />
          </div>
          <p className="text-sm font-medium font-retro">Illustration Area</p>
          <p className="text-xs text-gray-600 mt-1 font-retro">Beautiful landscape would go here</p>
        </div>
      </div>
      {/* Windows */}
      {openWindows
        .filter((w) => !w.isMinimized)
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((window) => (
          <RetroWindow
            key={window.id}
            window={window}
            isActive={activeWindow === window.id}
            onClose={() => closeWindow(window.id)}
            onMinimize={() => minimizeWindow(window.id)}
            onFocus={() => setActiveWindow(window.id)}
            onMouseDown={(e) => handleMouseDown(e, window.id, window.position)}
            isDragging={dragState.isDragging && dragState.windowId === window.id}
          />
        ))}
    </div>
  );
}

function RetroWindow({
  window,
  isActive,
  onClose,
  onMinimize,
  onFocus,
  onMouseDown,
  isDragging,
}: {
  window: Window;
  isActive: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onFocus: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  isDragging: boolean;
}) {
  return (
    <div
      className={`absolute bg-white border-2 border-gray-800 shadow-lg transition-shadow duration-200 ${
        isActive ? "shadow-xl" : "shadow-md"
      } ${isDragging ? "shadow-2xl" : ""}`}
      style={{
        left: window.position.x,
        top: window.position.y,
        width: window.size.width,
        height: window.size.height,
        zIndex: window.zIndex,
      }}
      onClick={onFocus}
    >
      <div
        className={`h-6 flex items-center justify-between px-2 cursor-grab active:cursor-grabbing select-none border-b-2 border-gray-800 ${
          isActive ? "bg-gray-200" : "bg-gray-100"
        } ${isDragging ? "cursor-grabbing" : ""}`}
        style={{
          backgroundImage: isActive
            ? "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.1) 1px, rgba(0,0,0,0.1) 2px)"
            : "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.05) 1px, rgba(0,0,0,0.05) 2px)",
        }}
        onMouseDown={onMouseDown}
      >
        <span className="text-xs font-bold text-gray-800 font-retro">{window.title}</span>
        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-4 h-4 bg-white border-2 border-gray-800 text-xs font-bold text-gray-800 hover:bg-gray-100 flex items-center justify-center font-retro"
            style={{ fontSize: "8px" }}
          >
            ×
          </button>
        </div>
      </div>

      <div
        className="p-3 h-full overflow-auto bg-white text-gray-800 font-retro"
        style={{ height: "calc(100% - 24px)" }}
      >
        {window.content}
      </div>
    </div>
  );
}

function TutorialWindow() {
  const tutorials = [
    { title: "AI Website Building Basics", level: "Beginner", students: 1247, rating: 4.8 },
    { title: "Claude AI Prompting Mastery", level: "Intermediate", students: 892, rating: 4.9 },
    { title: "Building Your First SaaS", level: "Advanced", students: 634, rating: 4.7 },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold font-retro-title text-foreground">Available Tutorials</h2>
      {tutorials.map((tutorial, i) => (
        <Card key={i} className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-foreground font-retro">{tutorial.title}</h3>
            <Badge variant="outline" className="font-retro">
              {tutorial.level}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground font-retro">
            <span>{tutorial.students} students</span>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-foreground text-foreground" />
              <span>{tutorial.rating}</span>
            </div>
          </div>
          <Button className="mt-2 font-retro" size="sm">
            <Play className="w-4 h-4 mr-2" />
            Start Learning
          </Button>
        </Card>
      ))}
    </div>
  );
}

function CommunityWindow() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold font-retro-title text-foreground">Discord Community</h2>
      <div className="bg-muted text-foreground p-4 border-2 border-black">
        <h3 className="font-bold mb-2 font-retro">JOIN 2,847 AI WEBSITE BUILDERS</h3>
        <p className="text-sm mb-4 font-retro">
          Get instant help, share your wins, and learn from others building profitable websites with
          AI.
        </p>
        <Button className="font-retro">
          <ExternalLink className="w-4 h-4 mr-2" />
          Join Discord
        </Button>
      </div>
      <div className="space-y-2">
        <h4 className="font-semibold text-foreground font-retro">Recent Activity</h4>
        <div className="text-sm space-y-1 text-muted-foreground font-retro-mono">
          <p>
            [SUCCESS] <strong className="text-foreground">Sarah_M</strong> deployed first client
            site!
          </p>
          <p>
            [UPDATE] <strong className="text-foreground">Mike_R</strong> shared new Claude prompt
            template
          </p>
          <p>
            [MILESTONE] <strong className="text-foreground">Alex_K</strong> achieved $5k MRR with AI
            websites
          </p>
        </div>
      </div>
    </div>
  );
}

function AgencyWindow() {
  const packages = [
    {
      name: "SaaS Starter Kit",
      price: "$2,997",
      features: ["Landing page", "Auth system", "Payment integration"],
    },
    {
      name: "E-commerce Pro",
      price: "$4,997",
      features: ["Product catalog", "Shopping cart", "Admin dashboard"],
    },
    {
      name: "Local Business",
      price: "$1,497",
      features: ["Service pages", "Contact forms", "SEO optimized"],
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold font-retro-title text-foreground">Agency Packages</h2>
      <p className="text-muted-foreground font-retro">
        Pre-built website packages you can sell to clients
      </p>
      <div className="grid gap-4">
        {packages.map((pkg, i) => (
          <Card key={i} className="p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold mb-2 text-foreground font-retro">{pkg.name}</h3>
              <span className="font-bold text-foreground font-retro">{pkg.price}</span>
            </div>
            <ul className="text-sm space-y-1 mb-3 text-muted-foreground font-retro">
              {pkg.features.map((feature, j) => (
                <li key={j}>• {feature}</li>
              ))}
            </ul>
            <Button size="sm" className="font-retro">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function BookingWindow() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold font-retro-title text-foreground">Book Support</h2>
      <p className="text-muted-foreground font-retro">
        Get personalized help with your AI website projects
      </p>
      <div className="space-y-3">
        <Card className="p-4">
          <h3 className="font-semibold mb-2 text-foreground font-retro">Strategy Session</h3>
          <p className="text-sm text-muted-foreground mb-2 font-retro">
            60-minute call to plan your website business
          </p>
          <div className="flex justify-between items-center">
            <span className="font-bold text-foreground font-retro">$197</span>
            <Button size="sm" className="font-retro">
              Book Now
            </Button>
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold mb-2 text-foreground font-retro">Technical Review</h3>
          <p className="text-sm text-muted-foreground mb-2 font-retro">
            Code review and optimization suggestions
          </p>
          <div className="flex justify-between items-center">
            <span className="font-bold text-foreground font-retro">$297</span>
            <Button size="sm" className="font-retro">
              Book Now
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function AboutWindow() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold font-retro-title text-foreground">About System</h2>
      <div className="text-sm space-y-3 text-muted-foreground font-retro">
        <p>
          We believe that if we can build profitable websites with AI tools, so can you. Our
          community is built on sharing knowledge, supporting each other, and proving that anyone
          can succeed.
        </p>
        <p>
          Join thousands of builders who are using AI to create websites, start agencies, and build
          sustainable online businesses.
        </p>
        <div className="bg-muted border-2 border-black p-3 font-retro-mono text-xs text-foreground">
          SYSTEM VERSION: 1.0.0
          <br />
          BUILT WITH: ❤️ + AI TOOLS
          <br />
          COPYRIGHT: © 2024 FIND IT BE USEFUL
        </div>
      </div>
    </div>
  );
}
