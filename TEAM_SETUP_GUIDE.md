# 🎓 University Staff Tracker - Setup Guide for Team Members

## 📋 Prerequisites

Before setting up the project, ensure you have:
- ✅ **MySQL Server** (version 8.0 or higher) installed and running
- ✅ **Node.js** (version 18 or higher) installed
- ✅ **Git** installed
- ✅ A code editor (VS Code recommended)

---

## 🚀 Step-by-Step Setup Guide

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/ChumMonika/attednece.git

# Navigate to project directory
cd attednece
```

### Step 2: Install Dependencies

```bash
# Install all npm packages
npm install
```

### Step 3: Setup MySQL Database

#### Option A: Using MySQL Command Line

1. **Open MySQL Command Line:**
```bash
mysql -u root -p
```

2. **Create the database:**
```sql
CREATE DATABASE university_staff_tracker;
USE university_staff_tracker;
```

3. **Exit MySQL and run the setup script:**
```bash
# Exit MySQL first (type: exit)
mysql -u root -p university_staff_tracker < db.sql
```

4. **Run migrations to add latest features:**
```bash
# Add is_active fields for semester rollover
mysql -u root -p university_staff_tracker < migrations/0007_add_is_active_fields.sql
```

#### Option B: Using MySQL Workbench (GUI)

1. Open MySQL Workbench
2. Connect to your local MySQL server
3. Click **"File" → "Open SQL Script"**
4. Select `db.sql` from the project folder
5. Click **"Execute"** (⚡ lightning bolt icon)
6. Repeat for `migrations/0007_add_is_active_fields.sql`

### Step 4: Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Copy the example file
cp .env.example .env
```

Or manually create `.env` with this content:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=university_staff_tracker

# Session Secret (change this in production)
SESSION_SECRET=university-attendance-secret-key-2025

# Node Environment
NODE_ENV=development
```

**⚠️ IMPORTANT:** Replace `your_mysql_password_here` with your actual MySQL password!

### Step 5: Verify Database Setup

Check if tables were created successfully:

```bash
mysql -u root -p -e "USE university_staff_tracker; SHOW TABLES;"
```

You should see these tables:
- attendance
- class_moderators
- class_subjects
- classes
- departments
- leave_requests
- majors
- schedules
- semesters
- subjects
- users

### Step 6: Start the Application

```bash
# Start the development server
npm run dev
```

You should see:
```
✅ Successfully connected to MySQL database
✅ Successfully connected to database: university_staff_tracker
serving on http://localhost:5000
```

### Step 7: Access the Application

Open your browser and go to: **http://localhost:5000**

---

## 🔑 Default Login Credentials

The system has pre-configured users you can use for testing:

### Admin Account
- **Unique ID:** `ADMIN001`
- **Password:** `admin123`
- **Role:** Administrator (full access)

### Teacher Account
- **Unique ID:** `TCH001`
- **Password:** `teacher123`
- **Role:** Teacher

### Head of Department
- **Unique ID:** `HEAD001`
- **Password:** `head123`
- **Role:** Head

### Staff Account
- **Unique ID:** `STAFF001`
- **Password:** `staff123`
- **Role:** Staff

---

## 🗄️ Database Schema Overview

### Core Tables:

#### 1. **users** - Store all system users
- id, unique_id, name, email, password
- role (admin, head, teacher, moderator, staff, hr_assistant)
- department_id, class_id
- work_type, schedule, status

#### 2. **departments** - Academic departments
- id, name, short_name (ITE, DSE, BIO, etc.)

#### 3. **majors** - Academic majors/programs
- id, name, short_name, department_id
- Example: Bachelor of Data Science and Engineering (BDSE)

#### 4. **classes** - Student classes
- id, name, major_id, year, semester
- academic_year (2025-2026)
- **is_active** (for semester rollover)

#### 5. **subjects** - Courses/subjects
- id, name, code, credits
- Example: CS101 - Introduction to Programming

#### 6. **schedules** - Class schedules
- id, class_id, subject_id, teacher_id
- day, start_time, end_time, room
- **is_active** (for semester rollover)

#### 7. **semesters** - Academic semesters
- id, name, code, start_date, end_date
- is_active (only one can be active)

#### 8. **attendance** - Attendance records
- id, user_id, date, status (present/absent/leave)
- marked_at, marked_by

#### 9. **leave_requests** - Leave applications
- id, user_id, leave_type, start_date, end_date
- status (pending/approved/rejected)

---

## 🧪 Quick Test Checklist

After setup, test these features:

### ✅ Login System
- [ ] Can login with admin account
- [ ] Can login with teacher account
- [ ] Wrong password shows error
- [ ] Can logout successfully

### ✅ User Management (Admin)
- [ ] View all users in User Management page
- [ ] Add new user
- [ ] Edit user information
- [ ] Change user status (active/inactive)

### ✅ Configuration (Admin)
- [ ] View/Add/Edit Departments
- [ ] View/Add/Edit Majors
- [ ] View/Add/Edit Subjects
- [ ] View Semesters

### ✅ Academic Setup (Admin)
- [ ] View/Add/Edit Classes
- [ ] View/Add/Edit Schedules
- [ ] Assign teachers to classes

### ✅ Teacher Features
- [ ] View assigned schedule
- [ ] Mark student attendance
- [ ] View attendance history

---

## 🐛 Common Issues & Solutions

### Issue 1: "Cannot connect to database"
**Solution:**
1. Check if MySQL is running: `mysql -u root -p`
2. Verify database exists: `SHOW DATABASES;`
3. Check `.env` file has correct password

### Issue 2: "Table doesn't exist"
**Solution:**
1. Run the database script: `mysql -u root -p university_staff_tracker < db.sql`
2. Run migrations: `mysql -u root -p university_staff_tracker < migrations/0007_add_is_active_fields.sql`

### Issue 3: "Port 5000 already in use"
**Solution:**
1. Kill the process: `taskkill /F /IM node.exe` (Windows)
2. Or change port in `server/index.ts`

### Issue 4: "npm install fails"
**Solution:**
1. Delete `node_modules` folder
2. Delete `package-lock.json`
3. Run `npm install` again

### Issue 5: "Login doesn't work"
**Solution:**
1. Check if users exist in database:
```bash
mysql -u root -p -e "USE university_staff_tracker; SELECT unique_id, name, role FROM users;"
```
2. If no users, run: `mysql -u root -p university_staff_tracker < db.sql`

---

## 📁 Project Structure

```
pp-Att/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/        # Page components
│   │   ├── lib/          # Utilities
│   │   └── types/        # TypeScript types
│   └── index.html
├── server/                # Backend Express application
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API endpoints
│   ├── storage.ts        # Database operations
│   └── vite.ts           # Development server
├── shared/               # Shared code between client/server
│   └── schema.ts         # Database schema & validation
├── migrations/           # Database migrations
│   └── *.sql
├── tests/               # Test files
│   └── e2e.test.ts      # End-to-end tests
├── db.sql               # 🔥 Main database setup script
├── .env                 # Environment variables (create this)
├── package.json         # Dependencies
└── README.md
```

---

## 🎯 Demo Preparation Tips

### Before the Demo:
1. **Clear old test data** (see next section)
2. **Create fresh sample data** for demo
3. **Test all features** work correctly
4. **Prepare user accounts** for different roles
5. **Note down credentials** on a cheat sheet

### Sample Data for Demo:
- 3-4 departments (ITE, DSE, Biology, Business)
- 2-3 majors per department
- 5-10 subjects
- 3-5 classes per major
- 10-15 users (mix of roles)
- Some schedules assigned
- Some attendance records

---

## 🗑️ Reset Database for Fresh Demo

If you need to clear all data and start fresh:

```bash
# Drop and recreate database
mysql -u root -p -e "DROP DATABASE IF EXISTS university_staff_tracker; CREATE DATABASE university_staff_tracker;"

# Reload the schema
mysql -u root -p university_staff_tracker < db.sql

# Apply migrations
mysql -u root -p university_staff_tracker < migrations/0007_add_is_active_fields.sql
```

**Note:** This will delete ALL data. Make sure to backup if needed!

---

## 📞 Support

If you encounter issues:
1. Check this guide's troubleshooting section
2. Check the main `README.md`
3. Contact the team lead
4. Check project documentation in `ACADEMIC_ROLLOVER_IMPLEMENTATION.md`

---

## ✅ Setup Complete Checklist

Before demo, verify:
- [ ] Database is created and tables exist
- [ ] Can login with admin account
- [ ] Can see dashboard
- [ ] Sample data is loaded
- [ ] All main features work
- [ ] No console errors in browser (F12)
- [ ] Server runs without errors

**Ready to demo!** 🎉
