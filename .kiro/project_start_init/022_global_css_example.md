/* global.css - Retro Windows 95-Inspired Tailwind Setup for Layer Cake */

/* Tailwind Directives (assuming Tailwind is installed via PostCSS) */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom CSS Variables for Retro Theme */
:root {
  --win95-bg: linear-gradient(135deg, #c0c0c0 0%, #f0f0f0 100%);
  --win95-border: #c0c0c0;
  --win95-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  --win95-titlebar: linear-gradient(90deg, #dfdfdf 0%, #f0f0f0 100%);
  --win95-text: #000080; /* Classic blue */
  --win95-highlight: #0000ff;
  --win95-button-hover: #e0e0e0;
  --layercake-primary: #8b4513; /* Saddle brown for cake theme */
  --layercake-accent: #deb887; /* Burlywood for layers */
}

/* Base Styles */
@layer base {
  body {
    @apply bg-gradient-to-br from-slate-100 to-slate-200 font-sans antialiased;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }

  /* Retro Scrollbars */
  ::-webkit-scrollbar {
    width: 16px;
  }

  ::-webkit-scrollbar-track {
    background: var(--win95-bg);
    border: 1px solid var(--win95-border);
  }

  ::-webkit-scrollbar-thumb {
    background: linear-gradient(90deg, #c0c0c0, #e0e0e0);
    border: 1px solid #808080;
  }
}

/* Component Styles for Windows */
@layer components {
  .retro-window {
    @apply bg-white border-2 border-slate-300 rounded-lg shadow-2xl;
    box-shadow: var(--win95-shadow);
  }

  .retro-titlebar {
    @apply bg-gradient-to-r from-gray-200 to-gray-300 border-b border-gray-400 px-3 py-1 flex justify-between items-center rounded-t-lg;
    background: var(--win95-titlebar);
    font-weight: 700;
    font-size: 0.875rem;
  }

  .retro-titlebar-button {
    @apply w-3 h-3 rounded-full flex-shrink-0;
  }

  .retro-titlebar-button:nth-child(1) { /* Minimize */
    @apply bg-gray-400;
  }

  .retro-titlebar-button:nth-child(2) { /* Maximize */
    @apply bg-gray-400;
  }

  .retro-titlebar-button:nth-child(3) { /* Close */
    @apply bg-red-500 hover:bg-red-600;
  }

  .retro-button {
    @apply px-4 py-2 rounded border font-medium text-sm transition-colors;
    border-color: var(--win95-border);
    background: var(--win95-bg);
    color: var(--win95-text);
  }

  .retro-button:hover {
    background: var(--win95-button-hover);
  }

  .retro-button-primary {
    @apply bg-blue-600 text-white hover:bg-blue-700;
    background: var(--win95-highlight);
  }

  /* Layer Cake Theming */
  .layercake-emoji {
    font-size: 2rem;
  }

  .layercake-gradient {
    background: linear-gradient(135deg, var(--layercake-accent) 0%, var(--layercake-primary) 100%);
  }
}

/* Utilities */
@layer utilities {
  .retro-shadow {
    box-shadow: var(--win95-shadow);
  }

  .retro-text {
    color: var(--win95-text);
  }
}