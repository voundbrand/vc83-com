# Rem's World UI - Retro Desktop Experience

A nostalgic journey through the golden age of computing, featuring an authentic 1980s desktop interface with modern web technology.

![Rem's World Screenshot](https://via.placeholder.com/800x500/1e1e20/8b5cf6?text=Rem%27s+World+Desktop)

## ✨ Features

- **🖥️ Authentic Retro Desktop** - Faithful recreation of Mac OS X/Apple Lisa interface
- **🪟 Advanced Window Management** - Draggable, resizable windows with proper focus handling
- **🎨 80s Purple Theme** - Slate grays with purple accents and retro styling
- **📱 Responsive Design** - Works seamlessly across desktop, tablet, and mobile
- **💾 State Persistence** - Window positions and desktop state saved locally
- **⚡ Modern Performance** - Built with Next.js 15 and TypeScript for optimal speed
- **🔄 Real-time Backend** - Powered by Convex for future multiplayer features
- **🎯 Single-Instance Windows** - Smart window management prevents duplicates

## 🚀 Live Demo

Visit the live application: [Rem's World UI](https://rems-world-9me0631yz-voundbrands-projects.vercel.app)

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, TypeScript, React 19
- **Styling**: Tailwind CSS v4, Custom 80s theme
- **Backend**: Convex (real-time database)
- **UI Components**: Radix UI primitives
- **Animation**: Framer Motion
- **Deployment**: Vercel
- **Window System**: Custom React-based window manager

## 📦 Quick Start

1. **Clone the repository**

   ```bash
   git clone https://github.com/voundbrand/rems-world-ui.git
   cd rems-world-ui
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment**

   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your Convex URL
   ```

4. **Start development server**

   ```bash
   pnpm run dev:all
   ```

5. **Open your browser**
   Visit `http://localhost:3000`

## 🏗️ Development

### Available Scripts

```bash
# Development
pnpm run dev          # Next.js development server
pnpm run dev:all      # Start both Convex and Next.js
pnpm run convex       # Convex development server

# Quality Assurance
pnpm run check-all    # Run all checks (recommended before commit)
pnpm run typecheck    # TypeScript type checking
pnpm run lint         # ESLint validation
pnpm run format       # Auto-format code

# Production
pnpm run build        # Build for production
pnpm run start        # Start production server
```

### Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Desktop environment
│   └── globals.css        # 80s retro theme styles
├── components/            # React components
│   ├── retro-desktop.tsx  # Main desktop interface
│   ├── window-manager/    # Window system
│   └── ui/               # Reusable UI components
├── lib/                  # Utilities
│   ├── window-utils.ts   # Window positioning logic
│   └── utils.ts          # Helper functions
└── window-registry.tsx   # Application definitions
```

## 🎨 Design Philosophy

Rem's World captures the essence of 1980s computing with:

- **Sharp, pixelated edges** instead of modern rounded corners
- **Monospace typography** reminiscent of early terminals
- **Purple and slate color palette** inspired by 80s synthwave
- **Subtle grid patterns** echoing CRT monitor aesthetics
- **Authentic window chrome** matching classic Mac OS design

## 🪟 Window System Features

- **Drag to move** - Click and drag window title bars
- **Resize functionality** - Drag corners to resize windows
- **Focus management** - Click to bring windows to front
- **Minimize/Maximize** - Classic window controls
- **Smart positioning** - Automatic cascade for new windows
- **State persistence** - Window positions saved between sessions

## 🔧 Configuration

### Environment Variables

```bash
# Required
NEXT_PUBLIC_CONVEX_URL=https://your-convex-deployment.convex.cloud

# Optional (for authentication)
AUTH_GITHUB_ID=your-github-oauth-id
AUTH_GITHUB_SECRET=your-github-oauth-secret
```

### Convex Setup

1. Create account at [Convex](https://convex.dev)
2. Create new project
3. Copy deployment URL to `.env.local`
4. Run `pnpm run convex` to sync schema

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Run quality checks (`pnpm run check-all`)
4. Commit changes (`git commit -m 'Add amazing feature'`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open Pull Request

## 🐛 Troubleshooting

### Common Issues

- **Window positioning problems**: Clear localStorage and refresh
- **Hydration errors**: Ensure client-side only components are properly marked
- **Build failures**: Run `pnpm run typecheck` to identify TypeScript issues
- **Convex connection**: Verify `NEXT_PUBLIC_CONVEX_URL` in environment

### Getting Help

- Check existing [Issues](https://github.com/voundbrand/rems-world-ui/issues)
- Review [Window Positioning Fix Documentation](./WINDOW_POSITIONING_FIX.md)
- Consult the [Convex Documentation](https://docs.convex.dev)

## 📚 Documentation

- [Development Guidelines](./CLAUDE.md) - Complete setup and development instructions
- [Window Positioning Fix](./WINDOW_POSITIONING_FIX.md) - Troubleshooting guide
- [Convex Setup](./CONVEX_SETUP.md) - Database configuration

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by classic Mac OS and Apple Lisa interfaces
- Built with modern React and Next.js best practices
- Styled with love for the 80s computing era
- Powered by the amazing Convex real-time database

---

**Built with ❤️ and nostalgia for the golden age of computing**
