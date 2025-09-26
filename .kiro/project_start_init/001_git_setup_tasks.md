# 001 - Git Setup Tasks

## Objective
Set up Git repository locally and on GitHub, then connect to Vercel for automatic deployments.

## Tasks

### 1. Local Git Setup ✅
- [x] Git repository already initialized
- [x] .gitignore file exists with appropriate exclusions

### 2. Initial Commit
- [ ] Stage all files for initial commit
- [ ] Create meaningful initial commit message
- [ ] Verify commit includes all necessary files

### 3. GitHub Repository Setup
- [ ] Create new repository on GitHub (name: vc83-com)
- [ ] Set repository visibility (public/private)
- [ ] Add repository description

### 4. Connect Local to Remote
- [ ] Add GitHub as remote origin
- [ ] Push main branch to GitHub
- [ ] Verify all files are pushed correctly

### 5. Vercel Integration
- [ ] Import repository to Vercel
- [ ] Configure build settings
- [ ] Set environment variables (CONVEX_URL, etc.)
- [ ] Enable automatic deployments on push to main

## Commands Reference

```bash
# Stage all files
git add .

# Create initial commit
git commit -m "Initial commit: Next.js + Convex setup with retro desktop UI"

# Add remote (replace USERNAME with your GitHub username)
git remote add origin https://github.com/USERNAME/vc83-com.git

# Push to GitHub
git push -u origin main
```

## Notes
- Ensure Convex environment variables are properly set in Vercel
- The .gitignore already excludes sensitive files (.env, node_modules, etc.)
- Vercel will automatically detect Next.js and configure build settings