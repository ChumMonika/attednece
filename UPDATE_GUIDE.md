# Update Guide for Existing Project Setup

## For Team Members Who Already Have Project Cloned

If you already have the project on your machine, just follow these steps to update:

---

## Step 1: Pull Latest Code

```powershell
# Navigate to your project folder
cd to project

# Pull the latest changes from GitHub
git pull origin main

# Install any new dependencies
npm install
```

---

## Step 2: Update Database (If Needed)

### Refresh Database Schema (Drop and Recreate)

If the database schema changed or you want fresh sample data:

```powershell
# Drop the old database
mysql -u root -p -e "DROP DATABASE university_staff_tracker;"

# Create new database with latest schema
mysql -u root -p < database_setup.sql

# Done! Database is updated
```

---



## Step 3: Start the App

```powershell
npm run dev

# Open: http://localhost:5000
```
