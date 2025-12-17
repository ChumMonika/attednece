# Git Push Instructions for Project Lead

## Before First Push - IMPORTANT!

Make sure `.env` file is NOT committed:

```powershell
# Check if .env is in git tracking (should show NOTHING)
git status
# If .env appears in output, remove it:
git rm --cached .env
```

---

## Step 1: Stage All Changes

```powershell
cd d:\Bachelor_of_DSE\Y3-S1\Coding\pp-Att

# Add all files (except .env - automatically ignored by .gitignore)
git add .

# Verify what will be pushed
git status
```

---

## Step 2: Commit Changes

```powershell
git commit -m "Final update: User management with bulk delete, improved filters, status field, team setup guides"
```

---

## Step 3: Push to GitHub

```powershell
# Push to main branch
git push origin main

# Or if you have set upstream:
git push
```

---

## Step 4: Verify on GitHub

1. Go to: https://github.com/ChumMonika/attednece
2. Verify all files are there
3. Check that `.env` is NOT visible (should be in .gitignore)

---

## For Team Members After Push

They should run:

```powershell
# Clone or pull latest
git clone https://github.com/ChumMonika/attednece.git
# OR if already cloned:
git pull origin main

# Setup (first time only)
.\setup.bat

# Configure .env with their MySQL password
# Edit .env file

# Initialize database
mysql -u root -p < database_setup.sql

# Start development
npm run dev
```

---

## What Gets Pushed

✔ Source code (TypeScript, React, Express)
✔ Configuration files (tsconfig.json, vite.config.ts)
✔ Documentation (SETUP_GUIDE.md, TEAM_SETUP.md)
✔ Setup scripts (setup.bat, database_setup.sql)
✔ .gitignore (keeps .env out)
✔ package.json (dependencies list)

❌ Does NOT get pushed:
- .env file (has passwords!)
- node_modules/ (too large)
- dist/ folder (build artifacts)

---

## Commands Summary

```powershell
# Do this ONCE before pushing:
git status  # Make sure .env is not tracked

# Push changes:
git add .
git commit -m "Your commit message"
git push origin main

# Team pulls updates:
git pull origin main
npm install
npm run dev
```

---

All set! Your team can now clone and run the project! 🚀
