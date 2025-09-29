"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { WindowState } from "@/lib/window-utils";
import { useWindowManager } from "./useWindowManager";
import { X, Minus, Square, Maximize2 } from "lucide-react";

interface WindowProps {
  windowState: WindowState;
  children: React.ReactNode;
}

export function Window({ windowState, children }: WindowProps) {
  const { close, focus, move, resize, minimize, maximize, restore, activeWindowId } =
    useWindowManager();
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const windowRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, windowX: 0, windowY: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const isActive = activeWindowId === windowState.id;

  // Handle window click to focus
  const handleWindowClick = useCallback(() => {
    if (!isActive) {
      focus(windowState.id);
    }
  }, [isActive, focus, windowState.id]);

  // Handle drag start
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (windowState.isMaximized) return;

      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        windowX: windowState.position.x,
        windowY: windowState.position.y,
      };
    },
    [windowState.position, windowState.isMaximized],
  );

  // Handle resize start
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (windowState.isMaximized) return;

      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      resizeStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        width: windowState.size.width,
        height: windowState.size.height,
      };
    },
    [windowState.size, windowState.isMaximized],
  );

  // Handle mouse move for drag and resize
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;

        move(windowState.id, {
          x: dragStartRef.current.windowX + deltaX,
          y: dragStartRef.current.windowY + deltaY,
        });
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStartRef.current.x;
        const deltaY = e.clientY - resizeStartRef.current.y;

        resize(windowState.id, {
          width: resizeStartRef.current.width + deltaX,
          height: resizeStartRef.current.height + deltaY,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isResizing, move, resize, windowState.id]);

  // Handle window controls
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    close(windowState.id);
  };

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    minimize(windowState.id);
  };

  const handleMaximize = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (windowState.isMaximized) {
      restore(windowState.id);
    } else {
      maximize(windowState.id);
    }
  };

  if (windowState.isMinimized) {
    return null; // Don't render minimized windows
  }

  return (
    <div
      ref={windowRef}
      className={`window fixed ${isActive ? "active" : ""} ${isDragging ? "dragging" : ""}`}
      style={{
        left: windowState.position.x,
        top: windowState.position.y,
        width: windowState.size.width,
        height: windowState.size.height,
        zIndex: windowState.zIndex,
        opacity: isDragging ? 0.95 : 1,
      }}
      onClick={handleWindowClick}
    >
      {/* Window Header */}
      <div className="window-header" onMouseDown={handleDragStart}>
        <div className="window-title">
          <span>{windowState.title}</span>
        </div>

        <div className="window-controls">
          <button className="window-control" onClick={handleMinimize} title="Minimize">
            <Minus size={10} />
          </button>
          <button
            className="window-control"
            onClick={handleMaximize}
            title={windowState.isMaximized ? "Restore" : "Maximize"}
          >
            {windowState.isMaximized ? <Square size={10} /> : <Maximize2 size={10} />}
          </button>
          <button
            className="window-control window-control-close"
            onClick={handleClose}
            title="Close"
          >
            <X size={10} />
          </button>
        </div>
      </div>

      {/* Window Content */}
      <div className="window-content">{children}</div>

      {/* Resize Handle */}
      {!windowState.isMaximized && (
        <div className="window-resize-handle" onMouseDown={handleResizeStart} />
      )}

      <style jsx>{`
        .window.dragging {
          cursor: move !important;
        }

        .window-resize-handle {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 16px;
          height: 16px;
          cursor: se-resize;
          background: linear-gradient(
            135deg,
            transparent 0%,
            transparent 50%,
            var(--border-primary) 50%,
            var(--border-primary) 60%,
            transparent 60%,
            transparent 70%,
            var(--border-primary) 70%,
            var(--border-primary) 80%,
            transparent 80%
          );
        }

        .window-control-close:hover {
          background: var(--system-red) !important;
          border-color: var(--system-red) !important;
          color: white !important;
        }
      `}</style>
    </div>
  );
}
