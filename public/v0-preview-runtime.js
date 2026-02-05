/**
 * V0 Preview Runtime
 *
 * This file runs inside the srcdoc iframe to transpile and render v0-generated
 * React/TSX files. It reads data from window.__V0_DATA (set by the parent
 * component) and uses Babel + esm.sh to execute the code.
 *
 * Loaded as an inline <script> in the srcdoc HTML. NOT a template literal --
 * all regex patterns and JS syntax work normally here.
 */

// ======= CDN imports (these resolve via the import map in the HTML head) =======
import React from "react";
import ReactDOM from "react-dom/client";

window.__REACT__ = React;
window.__REACT_DOM__ = ReactDOM;

// ======= Patch React.createElement to catch undefined components (Error #130) =======
const _origCreateElement = React.createElement;
React.createElement = function(type, ...rest) {
  if (type === undefined || type === null) {
    const stack = new Error().stack || "";
    console.error("[Preview] createElement called with", type, "type! Substituting div. Stack:", stack.split("\n").slice(1, 4).join("\n"));
    return _origCreateElement("div", ...rest);
  }
  return _origCreateElement(type, ...rest);
};

// ======= Read data injected by the parent =======
const { FILES, STUBS, mainFile } = window.__V0_DATA;

// ======= Module cache =======
const moduleCache = new Map();

// ======= Resolve import path =======
function resolvePath(from, to) {
  // Handle @/ alias
  if (to.startsWith("@/")) return "/" + to.slice(2);
  // Handle relative paths
  if (to.startsWith("./") || to.startsWith("../")) {
    const fromDir = from.split("/").slice(0, -1).join("/");
    const parts = (fromDir + "/" + to).split("/").filter(Boolean);
    const resolved = [];
    for (const p of parts) {
      if (p === "..") resolved.pop();
      else if (p !== ".") resolved.push(p);
    }
    return "/" + resolved.join("/");
  }
  return to;
}

// ======= Find file with extension fallback =======
function findFile(path) {
  if (FILES[path]) return path;
  const exts = [".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts", "/index.jsx", "/index.js"];
  for (const ext of exts) {
    if (FILES[path + ext]) return path + ext;
  }
  return null;
}

// ======= Transpile and execute a module =======
async function loadModule(path) {
  if (moduleCache.has(path)) return moduleCache.get(path);

  // Check stubs first (for next/*, react/*, @/lib/utils, @/components/ui/*)
  const normalized = path.replace(/^\//, "").replace(/\.(tsx?|jsx?)$/, "");
  const stubKey = Object.keys(STUBS).find(k => {
    if (k === path) return true;
    const stubNormalized = k.replace(/^@\//, "").replace(/^\//, "");
    if (normalized === stubNormalized) return true;
    if (k === "@/" + normalized) return true;
    // Direct match for package paths like react/jsx-runtime, next/image
    if (k === normalized) return true;
    return false;
  });

  if (stubKey) {
    const mod = { exports: {}, default: undefined };
    moduleCache.set(path, mod);
    try {
      const blob = new Blob([STUBS[stubKey]], { type: "application/javascript" });
      const url = URL.createObjectURL(blob);
      const imported = await import(url);
      URL.revokeObjectURL(url);
      Object.assign(mod, imported);
      mod.exports = imported;
      // Debug: log stub exports to verify they loaded correctly
      const exportNames = Object.keys(imported).filter(k => k !== "__esModule");
      if (exportNames.length === 0) {
        console.warn("[Preview] Stub loaded but has NO exports:", path, "(key:", stubKey + ")");
      }
      return mod;
    } catch (e) {
      console.warn("[Preview] Stub error for", path, "(key:", stubKey + ")", e);
      return mod;
    }
  }

  // Find the file
  const filePath = findFile(path);
  if (!filePath) {
    // If it looks like a bare package specifier (not a local path), try dynamic
    // import() which resolves through the HTML import map (esm.sh CDN).
    const isBareSpecifier = !path.startsWith("/") && !path.startsWith("./") && !path.startsWith("../");
    if (isBareSpecifier) {
      try {
        const imported = await import(path);
        const mod = { exports: imported, default: imported.default };
        moduleCache.set(path, mod);
        return mod;
      } catch (e) {
        console.warn("[Preview] CDN import failed for", path, e);
      }
    }
    console.warn("[Preview] Module not found:", path);
    // For UI component/hook paths, return a Proxy that auto-generates
    // passthrough div components. This prevents React error #130 when
    // v0 uses components we don't have stubs for.
    const isComponentPath = path.includes("/components/") || path.includes("/hooks/") || path.includes("/lib/");
    if (isComponentPath) {
      // Filter out non-DOM props to avoid React warnings on passthrough divs
      function safeDomProps(p) {
        if (!p) return {};
        const skip = new Set(["asChild","variant","size","pressed","onPressedChange","onCheckedChange","onValueChange","defaultValue","checked","onOpenChange","open","collapsible","orientation","decorative","sideOffset","alignOffset","avoidCollisions","type","value","mode","selected","onSelect","side","align","forceMount"]);
        const out = {};
        for (const k in p) {
          if (k === "children" || k === "className") continue;
          if (!skip.has(k)) out[k] = p[k];
        }
        return out;
      }
      // Create a default passthrough component for default imports
      const DefaultComponent = React.forwardRef(function(p, ref) {
        const { className, children } = p || {};
        return React.createElement("div", { ref, className: className || "", ...safeDomProps(p) }, children);
      });
      DefaultComponent.displayName = path.split("/").pop().replace(/\.\w+$/, "");

      const passthroughHandler = {
        get(target, prop) {
          if (prop === "__esModule") return true;
          if (prop === "default") return target.default || DefaultComponent;
          if (typeof prop === "symbol") return target[prop];
          // Return a cached passthrough component for any named export
          if (!target[prop]) {
            const name = String(prop);
            // Hook-like names return no-ops
            if (name.startsWith("use")) {
              target[prop] = function() { return {}; };
            } else {
              // Component-like names return passthrough divs
              const C = React.forwardRef(function(p, ref) {
                const { className, children } = p || {};
                return React.createElement("div", { ref, className: className || "", ...safeDomProps(p) }, children);
              });
              C.displayName = name;
              target[prop] = C;
            }
          }
          return target[prop];
        }
      };
      const proxyExports = new Proxy({}, passthroughHandler);
      const mod = { exports: proxyExports, default: DefaultComponent };
      moduleCache.set(path, mod);
      return mod;
    }
    const empty = { exports: {}, default: undefined };
    moduleCache.set(path, empty);
    return empty;
  }

  const mod = { exports: {}, default: undefined };
  moduleCache.set(path, mod); // Set early to handle circular deps

  const source = FILES[filePath];

  // Transpile TSX/TS with Babel (classic runtime = React.createElement calls)
  let code;
  try {
    const result = Babel.transform(source, {
      filename: filePath,
      presets: [
        ["react", { runtime: "classic" }],
        "typescript",
      ],
      plugins: [],
      sourceType: "module",
    });
    code = result.code;
  } catch (e) {
    console.error("[Preview] Babel error in", filePath, e);
    return mod;
  }

  // Replace imports with our virtual loader

  // First: strip type-only imports (TypeScript) before processing value imports
  code = code.replace(/import\s+type\s+\{[^}]*\}\s*from\s*["'][^"']+["'];?/g, "");
  code = code.replace(/import\s+type\s+\w+\s+from\s*["'][^"']+["'];?/g, "");

  // Helper: convert ES module "as" renames to JS destructuring ":" renames
  // e.g. "Star as StarIcon, Moon" → "Star: StarIcon, Moon"
  // Also strips "type" keyword from "import { type Foo }" (TypeScript inline types)
  function fixDestructure(names) {
    return names.split(",").map(n => {
      let t = n.trim();
      // Strip "type" keyword prefix (e.g. "type Foo" or "type Foo as Bar")
      if (t.startsWith("type ")) t = t.slice(5).trim();
      if (!t) return "";
      const parts = t.split(/\s+as\s+/);
      return parts.length === 2 ? `${parts[0].trim()}: ${parts[1].trim()}` : t;
    }).filter(Boolean).join(", ");
  }
  // Handle: import X, { A, B } from "Y" (combined default + named)
  code = code.replace(
    /import\s+(\w+)\s*,\s*{([^}]+)}\s*from\s*["']([^"']+)["']/g,
    (_, def, names, specifier) => {
      const resolved = resolvePath(filePath, specifier);
      const fixed = fixDestructure(names);
      return `const __m_${def} = await __load("${resolved}"); const ${def} = __m_${def}.default || __m_${def}.exports.default || __m_${def}.exports; const {${fixed}} = __m_${def}.exports`;
    }
  );
  // Handle: import { A, B } from "Y"
  code = code.replace(
    /import\s*{([^}]+)}\s*from\s*["']([^"']+)["']/g,
    (_, names, specifier) => {
      const resolved = resolvePath(filePath, specifier);
      const fixed = fixDestructure(names);
      return `const {${fixed}} = (await __load("${resolved}")).exports`;
    }
  );
  // Handle: import * as X from "Y"
  code = code.replace(
    /import\s*\*\s*as\s+(\w+)\s+from\s+["']([^"']+)["']/g,
    (_, name, specifier) => {
      const resolved = resolvePath(filePath, specifier);
      return `const ${name} = (await __load("${resolved}")).exports`;
    }
  );
  // Handle: import X from "Y" (default only)
  code = code.replace(
    /import\s+(\w+)\s+from\s+["']([^"']+)["']/g,
    (_, name, specifier) => {
      const resolved = resolvePath(filePath, specifier);
      return `const ${name} = (await __load("${resolved}")).default || (await __load("${resolved}")).exports`;
    }
  );
  // Remove bare imports (import "X") — type-only imports already stripped above
  code = code.replace(/import\s+["'][^"']+["'];?/g, "");
  // Remove type-only exports
  code = code.replace(/export\s+type\s+\{[^}]*\};?/g, "");
  code = code.replace(/export\s+type\s+\w+[^;]*;/g, "");

  // Replace export statements
  code = code.replace(/export\s+default\s+/g, "__mod.default = __mod.exports.default = ");
  code = code.replace(/export\s*{([^}]+)}/g, (_, names) => {
    return names.split(",").map(n => {
      let t = n.trim();
      // Skip type-only re-exports like "type Foo" or "type Foo as Bar"
      if (t.startsWith("type ")) return "";
      const [local, exported] = t.split(/\s+as\s+/);
      return `__mod.exports.${(exported || local).trim()} = ${local.trim()}`;
    }).filter(Boolean).join(";\n");
  });
  // Named exports: export const Foo = ... -> __mod.exports.Foo = ...
  code = code.replace(/export\s+(const|let|var)\s+(\w+)/g, (_, kw, name) => {
    return `__mod.exports.${name} = void 0; ${kw} __export_${name}`;
  });
  code = code.replace(/export\s+function\s+(\w+)/g, (_, name) => {
    return `__mod.exports.${name} = function ${name}`;
  });
  code = code.replace(/export\s+class\s+(\w+)/g, (_, name) => {
    return `__mod.exports.${name} = class ${name}`;
  });

  // Post-process: assign exported variable values back to mod.exports
  code = code.replace(/(?:const|let|var)\s+__export_(\w+)\s*=/g, (_, name) => {
    return `const __export_${name} = __mod.exports.${name} =`;
  });

  // Execute
  try {
    // Debug: log the import lines to verify correct rewriting
    const importLines = code.split("\n").filter(l => l.includes("__load") || l.includes("__mod.")).slice(0, 15);
    console.log("[Preview] Rewritten imports/exports for", filePath, importLines);

    // Debug: find lines containing 'as' keyword that might cause SyntaxError
    const suspectLines = code.split("\n").filter(l => /\bas\b/.test(l) && !/\b__load\b/.test(l)).slice(0, 5);
    if (suspectLines.length > 0) {
      console.log("[Preview] Suspect 'as' lines in", filePath, suspectLines);
    }
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const fn = new AsyncFunction("__mod", "__load", "React", "require", code);
    const requireFn = (spec) => {
      if (spec === "react" || spec === "react/jsx-runtime" || spec === "react/jsx-dev-runtime") {
        return {
          createElement: React.createElement,
          Fragment: React.Fragment,
          jsx: React.createElement,
          jsxs: React.createElement,
          default: React,
        };
      }
      return {};
    };
    await fn(mod, (spec) => loadModule(resolvePath(filePath, spec)), React, requireFn);

    // If no default export but has named exports, use first function
    if (!mod.default) {
      const firstFn = Object.values(mod.exports).find(v => typeof v === "function");
      if (firstFn) mod.default = firstFn;
    }
  } catch (e) {
    console.error("[Preview] Runtime error in", filePath, e);
    console.error("[Preview] Failed code (first 500 chars):", code?.slice(0, 500));
  }

  return mod;
}

// Make loadModule available globally for stubs
window.__load = loadModule;

// ======= Bootstrap =======
try {
  console.log("[Preview] Available files:", Object.keys(FILES));
  console.log("[Preview] Main file:", mainFile);
  console.log("[Preview] Main file exists in FILES:", mainFile in FILES);

  const mainModule = await loadModule(mainFile);
  const Component = mainModule.default || mainModule.exports.default;

  console.log("[Preview] Module keys:", Object.keys(mainModule.exports || {}));
  console.log("[Preview] Has default:", !!mainModule.default, "Has exports.default:", !!mainModule.exports?.default);
  console.log("[Preview] Component type:", typeof Component);

  // Error boundary class to catch React render errors
  class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { error: null }; }
    static getDerivedStateFromError(error) { return { error }; }
    componentDidCatch(error, info) { console.error("[Preview] React render error:", error, info?.componentStack); }
    render() {
      if (this.state.error) {
        return React.createElement("div", { style: { padding: "2rem", color: "#f87171", fontFamily: "system-ui" } },
          React.createElement("b", null, "Render Error"),
          React.createElement("pre", { style: { whiteSpace: "pre-wrap", marginTop: "8px", fontSize: "12px" } }, this.state.error.message || String(this.state.error))
        );
      }
      return this.props.children;
    }
  }

  if (Component && typeof Component === "function") {
    const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(React.createElement(ErrorBoundary, null, React.createElement(Component)));
  } else {
    // Try harder: look for any exported function that could be a component
    const exportedFns = Object.entries(mainModule.exports || {}).filter(([, v]) => typeof v === "function");
    if (exportedFns.length > 0) {
      console.log("[Preview] No default export, using first exported function:", exportedFns[0][0]);
      const root = ReactDOM.createRoot(document.getElementById("root"));
      root.render(React.createElement(ErrorBoundary, null, React.createElement(exportedFns[0][1])));
    } else {
      document.getElementById("root").innerHTML =
        '<div style="padding:2rem;color:#888;font-family:system-ui">No default export found in ' + mainFile + '.<br><small style="color:#666">Files: ' + Object.keys(FILES).join(', ') + '</small></div>';
      console.error("[Preview] No default export found. Module:", mainModule);
    }
  }
} catch (e) {
  document.getElementById("root").innerHTML =
    '<div style="padding:2rem;color:#f87171;font-family:system-ui"><b>Preview Error</b><pre style="white-space:pre-wrap;margin-top:8px;font-size:12px">' +
    (e.message || e) + '</pre></div>';
  console.error("[Preview] Bootstrap error:", e);
}
