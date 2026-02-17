"use client";

import React from "react";
import { Bot, Rocket, CalendarDays, BriefcaseBusiness, Building2 } from "lucide-react";
import type { ICPDefinition } from "./types";

interface ICPCardProps {
  icp: ICPDefinition;
  onSelect: (icpId: string) => void;
  isCompleted?: boolean;
}

/**
 * Individual ICP card with retro Win95 styling
 */
export function ICPCard({ icp, onSelect, isCompleted = false }: ICPCardProps) {
  const icpIconMap = {
    "ai-agency": Bot,
    "founder-builder": Rocket,
    "event-manager": CalendarDays,
    freelancer: BriefcaseBusiness,
    enterprise: Building2,
  } as const;
  const IcpIcon = icpIconMap[icp.id] ?? Bot;

  const handleClick = () => {
    if (!icp.comingSoon && !isCompleted) {
      onSelect(icp.id);
    }
  };

  return (
    <div
      className={`
        relative
        bg-gradient-to-br from-gray-100 to-gray-200
        border-4 border-gray-400
        rounded-none
        shadow-[4px_4px_0px_0px_rgba(0,0,0,0.25)]
        p-6
        transition-all
        ${
          icp.comingSoon
            ? "opacity-60 cursor-not-allowed"
            : isCompleted
            ? "border-green-600 bg-gradient-to-br from-green-50 to-green-100"
            : "hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] hover:translate-x-[-2px] hover:translate-y-[-2px] cursor-pointer"
        }
      `}
      onClick={handleClick}
    >
      {/* Coming Soon Overlay */}
      {icp.comingSoon && (
        <div className="absolute inset-0 bg-black/10 flex items-center justify-center z-10">
          <div className="bg-yellow-400 text-black px-4 py-2 border-2 border-black font-bold text-sm rotate-[-5deg] shadow-lg">
            COMING SOON
          </div>
        </div>
      )}

      {/* Completed Badge */}
      {isCompleted && (
        <div className="absolute top-2 right-2 bg-green-600 text-white px-3 py-1 border-2 border-green-800 font-bold text-xs">
          COMPLETED
        </div>
      )}

      {/* Icon */}
      <div className="mb-4 text-center flex items-center justify-center">
        <IcpIcon className="w-12 h-12 text-purple-700" />
      </div>

      {/* Name */}
      <h3 className="font-bold text-lg mb-2 text-center text-gray-900 border-b-2 border-gray-400 pb-2">
        {icp.name}
      </h3>

      {/* Description */}
      <p className="text-sm text-gray-700 mb-4 leading-relaxed">
        {icp.description}
      </p>

      {/* Features */}
      <div className="space-y-2 mb-4">
        <p className="text-xs font-bold text-gray-600 uppercase">Includes:</p>
        <ul className="space-y-1">
          {icp.features.slice(0, 3).map((feature, idx) => (
            <li key={idx} className="text-xs text-gray-700 flex items-start">
              <span className="text-purple-600 mr-2">▶</span>
              <span>{feature}</span>
            </li>
          ))}
          {icp.features.length > 3 && (
            <li className="text-xs text-gray-500 italic ml-4">
              + {icp.features.length - 3} more...
            </li>
          )}
        </ul>
      </div>

      {/* Action Button */}
      <button
        className={`
          w-full
          px-4 py-2
          border-4
          font-bold
          text-sm
          transition-all
          ${
            icp.comingSoon
              ? "bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed"
              : isCompleted
              ? "bg-green-600 text-white border-green-800 hover:bg-green-700"
              : "bg-purple-600 text-white border-purple-800 hover:bg-purple-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          }
          shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]
        `}
        disabled={icp.comingSoon || isCompleted}
      >
        {icp.comingSoon
          ? "COMING SOON"
          : isCompleted
          ? "COMPLETED"
          : "GET STARTED"}
      </button>
    </div>
  );
}
