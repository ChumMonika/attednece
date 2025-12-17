# 🚀 Quick Reference for Your Team

## Copy & Paste These Commands

### First Time Setup (Run Once)

```powershell
# Step 1: Clone project
git clone https://github.com/ChumMonika/attednece.git
cd attednece

# Step 2: Automated setup
.\setup.bat

# Step 3: When prompted, edit .env file:
# - Open .env in notepad
# - Find: DB_PASSWORD=
# - Replace with your MySQL password
# - Save and close

# Step 4: Create database
mysql -u root -p < database_setup.sql

# Step 5: Start application
npm run dev
```

**Done!** Open http://localhost:5000

---

## Everyday Commands

```powershell
# Start app (run this every day you work on it)
npm run dev

# Get latest code (when you push updates)
git pull origin main
npm install
npm run dev

# Update and push code (project lead only)
git add .
git commit -m "Your message here"
git push origin main
```

---

## Troubleshooting

```powershell
# MySQL not found?
mysql -u root -p

# Can't connect to database?
mysql -u root -p < database_setup.sql

# Port 5000 in use? Edit .env and change PORT=5001

# Dependencies broken?
Remove-Item node_modules -Recurse -Force
npm install
npm run dev

# Git issues?
git status  # See what's changed
git pull origin main  # Get latest
```

---

## Login Info

- Username: `ADMIN001`
- Password: **Ask project lead**

---

## Important Files

| File | What to Do |
|------|-----------|
| `.env` | EDIT with your MySQL password (never share!) |
| `database_setup.sql` | RUN once: `mysql -u root -p < database_setup.sql` |
| `setup.bat` | RUN once: `.\setup.bat` |
| `TEAM_SETUP.md` | READ for simple setup |
| `SETUP_GUIDE.md` | READ for detailed help |

---

## File Locations

```
Project Folder/
├── .env              ← You edit this (don't share!)
├── setup.bat         ← Run this once
├── database_setup.sql ← Run this in MySQL
├── TEAM_SETUP.md     ← Read this first
├── SETUP_GUIDE.md    ← Detailed help
└── src/              ← Source code
```

---

## Features You Can Test

✔ Create/Edit/Delete Users
✔ Bulk Select & Delete with Checkboxes
✔ Filter Users by Role, Status, Department
✔ Manage Classes with Auto-Naming
✔ Create & Manage Schedules
✔ Manage Subjects & Departments

---

## GitHub Link

**Repository:** https://github.com/ChumMonika/attednece

---

## Questions?

1. Check `SETUP_GUIDE.md` (has troubleshooting)
2. Check terminal error messages
3. Ask project lead

---

**All set!** You're ready to test! 🎉
