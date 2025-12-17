# University Attendance System - Setup Guide for Team

## Prerequisites
Before starting, ensure you have:
- **Node.js** v18+ installed
- **MySQL** v8.0+ installed and running
- **Git** installed
- **Visual Studio Code** or any code editor

---

## Step 1: Clone the Project from GitHub

```powershell
# Navigate to your desired directory
cd C:\your\project\folder

# Clone the repository
git clone https://github.com/ChumMonika/attednece.git

# Navigate to project folder
cd attednece
```

---

## Step 2: Install Dependencies

```powershell
# Install all npm packages
npm install

# This will install both server and client dependencies
```

---

## Step 3: Environment Configuration

Create a `.env` file in the root directory with your MySQL credentials:

```powershell
# Copy .env.example to .env (if it exists)
# If not, create .env file with these contents:
```

Edit `.env` file:
```
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=university_staff_tracker

# Application Configuration
NODE_ENV=development
PORT=3000

# Session Configuration
SESSION_SECRET=your_session_secret_here
```

**Important:** Replace `your_mysql_password` with your actual MySQL root password.

---

## Step 4: Database Setup

### Option A: Fresh Database Setup (Recommended)

```powershell
# Open MySQL Command Line or MySQL Workbench

# 1. Create the database
CREATE DATABASE university_staff_tracker;

# 2. Use the database
USE university_staff_tracker;

# 3. Run migration scripts (if available in migrations folder)
# Import the schema using the provided migration files
```

### Option B: If Team Has Existing Database

If the team already has `university_staff_tracker` database but with different schema:

```powershell
# Option 1: Drop and recreate (if testing data is not needed)
DROP DATABASE university_staff_tracker;
CREATE DATABASE university_staff_tracker;

# Option 2: Backup existing data first
mysqldump -u root -p university_staff_tracker > backup.sql

# Then drop and recreate
DROP DATABASE university_staff_tracker;
CREATE DATABASE university_staff_tracker;
```

---

## Step 5: Initialize Database Schema

The project uses **Drizzle ORM** for database management. Run the schema initialization:

```powershell
# This will create all necessary tables
npm run db:push

# Or if you have migration commands set up:
npm run migrate
```

---

## Step 6: Seed Sample Data (Optional)

```powershell
# Run seed script if available
npm run db:seed

# This will add sample users, departments, classes, etc.
```

---

## Step 7: Start the Development Server

```powershell
# Start the application in development mode
npm run dev

# Server will run on: http://localhost:5000
# Client will be available at: http://localhost:5000
```

**Wait for these messages:**
```
✅ Successfully connected to MySQL database
✅ Successfully connected to database: university_staff_tracker
2:18:00 PM [express] serving on http://localhost:5000
```

---

## Step 8: Login to Application

Open browser and go to: **http://localhost:5000**

### Default Admin Credentials:
- **Username:** ADMIN001
- **Password:** Ask project lead for credentials

---

## Common Issues & Solutions

### Issue 1: "Can't connect to MySQL server"
```powershell
# Check if MySQL is running
# Windows: Services → Look for MySQL
# Or start MySQL:
net start MySQL80

# Verify credentials in .env file
```

### Issue 2: "Database university_staff_tracker does not exist"
```powershell
# Create the database:
mysql -u root -p

# Then run:
CREATE DATABASE university_staff_tracker;
exit;

# Then run schema initialization:
npm run db:push
```

### Issue 3: "Port 5000 already in use"
```powershell
# Find and kill process using port 5000:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Or change port in .env
PORT=5001
```

### Issue 4: "Module not found" errors
```powershell
# Clear node_modules and reinstall
Remove-Item node_modules -Recurse -Force
npm install
```

---

## Step 9: Push Code to Git

### For Project Lead:

```powershell
# Stage all changes
git add .

# Commit with message
git commit -m "Final update: User management with bulk delete, improved filters, status field"

# Push to main branch
git push origin main
```

### For Team Members to Pull Updates:

```powershell
# Navigate to project folder
cd attednece

# Fetch latest changes
git fetch origin

# Pull latest code
git pull origin main

# Install any new dependencies
npm install
```

---

## Database Schema Overview

### Main Tables:
- **users** - Staff, teachers, admins with roles and status
- **departments** - IT, DSE, etc.
- **majors** - Program like "Bachelor DSE"
- **classes** - Class sections like "BDSE Y2S2 M1"
- **subjects** - Courses
- **schedules** - Class timetables
- **attendance** - Student/staff attendance records
- **leave_requests** - Leave application tracking

---

## Project Structure

```
pp-Att/
├── client/                 # React frontend
│   └── src/
│       ├── pages/         # Page components
│       ├── components/    # Reusable components
│       └── lib/           # Utilities
├── server/                # Express backend
│   ├── routes.ts         # API endpoints
│   └── storage.ts        # Database operations
├── shared/               # Shared types & schemas
├── migrations/           # Database migrations
├── .env                  # Environment config (DON'T COMMIT)
├── package.json          # Dependencies
└── tsconfig.json         # TypeScript config
```

---

## Build for Production

```powershell
# Build the project
npm run build

# Start production server
npm start

# Server will be optimized and ready for deployment
```

---

## Troubleshooting Checklist

- [ ] MySQL is running
- [ ] `.env` file has correct credentials
- [ ] Database `university_staff_tracker` exists
- [ ] Database schema is initialized (`npm run db:push`)
- [ ] Node modules are installed (`npm install`)
- [ ] No port conflicts (5000 is free)
- [ ] Git is up to date (`git pull origin main`)

---

## Team Communication

**If issues arise:**
1. Check error messages in terminal
2. Verify `.env` file configuration
3. Check MySQL connection: `mysql -u root -p`
4. Share full error message with team lead
5. Review this guide section by section

---

## Support

For questions or issues:
1. Check TROUBLESHOOTING section above
2. Review error messages in terminal
3. Check `.env` file setup
4. Restart application: `npm run dev`

Good luck! 🚀
