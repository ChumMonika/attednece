# Update Guide for Existing Project Setup

## For Team Members Who Already Have Project Cloned

If you already have the project on your machine, just follow these steps to update:

---

## Step 1: Pull Latest Code

```powershell
# Navigate to your project folder
cd path/to/your/attednece

# Pull the latest changes from GitHub
git pull origin main

# Install any new dependencies
npm install
```

---

## Step 2: Update Database (If Needed)

### Option A: Keep Existing Database Data
If you want to keep your current data, no action needed! Just restart the app:

```powershell
npm run dev
```

---

### Option B: Refresh Database Schema (Drop and Recreate)

If the database schema changed or you want fresh sample data:

```powershell
# Drop the old database
mysql -u root -p -e "DROP DATABASE university_staff_tracker;"

# Create new database with latest schema
mysql -u root -p < database_setup.sql

# Done! Database is updated
```

---

### Option C: Run Only New Migrations

If you only want to add new tables/columns without dropping:

```powershell
# Check if any new migrations exist in migrations/ folder
# Then run: npm run db:push
npm run db:push
```

---

## Step 3: Start the App

```powershell
npm run dev

# Open: http://localhost:5000
```

---

## That's It!

No need to:
- ❌ Clone again
- ❌ Create .env.example (already there)
- ❌ Create database_setup.sql (already there)
- ❌ Run setup.bat (only needed first time)

Just:
- ✔ `git pull origin main`
- ✔ `npm install`
- ✔ Optionally: `mysql -u root -p < database_setup.sql` (if schema changed)
- ✔ `npm run dev`

---

## When to Update Database

**Drop and recreate database when:**
- Schema structure changed (new tables, columns)
- You want fresh sample data
- You have data conflicts

**Keep database when:**
- Only bug fixes were deployed
- No database schema changes
- You want to keep existing data

---

## Commands Summary

```powershell
# Get latest code
git pull origin main
npm install

# Option 1: Keep existing database
npm run dev

# Option 2: Refresh database
mysql -u root -p < database_setup.sql
npm run dev

# Option 3: Just add new tables
npm run db:push
npm run dev
```

Done! 🚀
