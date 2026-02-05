"use client";

import { Suspense } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { LayersCanvas } from "@/components/layers/layers-canvas";

/**
 * /layers - Visual Automation Canvas
 *
 * Standalone full-screen page for the Layers workflow builder.
 * Wrapped in ReactFlowProvider for @xyflow/react context.
 * Suspense boundary required for useSearchParams() in LayersCanvas.
 *
 * Component hierarchy:
 *   LayersCanvas (main container)
 *     ├── TopBar (navigation, actions)
 *     ├── ToolChest (left panel, draggable nodes)
 *     ├── Canvas (React Flow workspace)
 *     │   ├── Custom Nodes
 *     │   ├── Custom Edges
 *     │   └── AIPromptOverlay (floating chat)
 *     ├── NodeInspector (right panel, expandable)
 *     └── MiniMap (bottom-right corner)
 */
export default function LayersPage() {
  return (
    <Suspense>
      <ReactFlowProvider>
        <LayersCanvas />
      </ReactFlowProvider>
    </Suspense>
  );
}
