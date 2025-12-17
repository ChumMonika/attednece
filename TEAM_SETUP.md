# University Attendance System - Quick Setup

## For Team Members - 3 Simple Steps

### Step 1: Clone and Setup (First Time Only)

```powershell
# 1. Clone the project
git clone https://github.com/ChumMonika/attednece.git
cd attednece

# 2. Run automated setup
.\setup.bat

# 3. Edit .env file with YOUR MySQL password:
# - Open .env file in text editor
# - Change DB_PASSWORD to your MySQL password
# - Save file
```

### Step 2: Initialize Database (First Time Only)

```powershell
# Open MySQL and run the setup script:
mysql -u root -p < database_setup.sql

# When prompted, enter your MySQL password
```

### Step 3: Start Application

```powershell
# If setup already done, just run:
npm run dev

# Open browser: http://localhost:5000
```

---

## Problem? Database Already Exists But Different Schema?

```powershell
# Option 1: Drop and recreate (if no important data)
mysql -u root -p -e "DROP DATABASE university_staff_tracker;"
mysql -u root -p < database_setup.sql

# Option 2: Keep backup of existing data
mysqldump -u root -p university_staff_tracker > backup_$(Get-Date -f 'yyyyMMdd_HHmmss').sql
# Then drop and recreate:
mysql -u root -p -e "DROP DATABASE university_staff_tracker;"
mysql -u root -p < database_setup.sql
```

---

## Git Workflow for Team

### Getting Latest Code:

```powershell
cd attednece
git pull origin main
npm install  # Install any new dependencies
npm run dev
```

### Project Lead - Pushing Updates:

```powershell
# After making changes:
git add .
git commit -m "Description of changes"
git push origin main

# Notify team to run: git pull origin main
```

---

## Login Credentials

- **Username:** ADMIN001
- **Password:** Ask project lead

---

## Important Files

| File | Purpose |
|------|---------|
| `.env` | Database & app config (DON'T commit) |
| `database_setup.sql` | Database schema |
| `setup.bat` | Automated setup script |
| `SETUP_GUIDE.md` | Detailed setup guide |

---

## Issues?

1. **Can't connect to MySQL?**
   - Check .env file has correct password
   - Check MySQL is running
   - Try: `mysql -u root -p` to verify

2. **Database errors?**
   - Run: `mysql -u root -p < database_setup.sql`

3. **Port 5000 in use?**
   - Edit .env: `PORT=5001`

4. **Dependencies issue?**
   - Delete node_modules: `Remove-Item node_modules -Recurse -Force`
   - Reinstall: `npm install`

See `SETUP_GUIDE.md` for more detailed help!

---

## Features Available

✔ User Management (Create, Read, Update, Delete)
✔ Bulk Delete with Checkboxes
✔ Role-Based Access (Admin, Head, Teacher, etc.)
✔ Department & Class Management
✔ Schedule Management
✔ Attendance Tracking (Coming Soon)
✔ Leave Requests (Coming Soon)

---

Good luck! Contact project lead if you have questions. 🚀
