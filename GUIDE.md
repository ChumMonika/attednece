# Setup & Update Guide

## 🆕 First Time Setup (New Members)

### Step 1: Clone Project
```powershell
git clone https://github.com/ChumMonika/attednece.git
cd attednece
npm install
```

### Step 2: Create `.env` File
Create a file named `.env` in the project root:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=university_staff_tracker
NODE_ENV=development
PORT=5000
SESSION_SECRET=your_session_secret
```

### Step 3: Set Up Database

**Option A: Using setup.bat (EASIEST - Windows)**
```powershell
.\setup.bat
```

**Option B: Manual setup**
```powershell
mysql -u root -p"" < database_setup_complete.sql
```

### Step 4: Run Project
```powershell
npm run dev
```

Open: **http://localhost:5000**

**Login Credentials:**
- Admin: `ADMIN001` / `admin123`
- Head: `HEAD001` / `head123`
- Teacher: `TEACHER001` / `teacher123`

---

## 📦 Update Existing Project (Existing Members)

Already have the project running? Choose ONE option:

### Option 1: Just Update Code (RECOMMENDED)
```powershell
git pull origin main
npm install
npm run dev
```

✅ Keeps your existing database  
✅ Only updates the code  
✅ Fastest way!

### Option 2: Reset Database with Fresh Data
```powershell
git pull origin main
npm install
mysql -u root -p"" < database_setup_complete.sql
npm run dev
```

⚠️ **WARNING**: Deletes ALL existing data and creates fresh sample data  
✅ Use only if you want to start fresh!

**Most of the time, use Option 1!**

---

## 🆘 Troubleshooting

**Port 5000 already in use?**
```powershell
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

**MySQL password error: "Access denied"?**
- Edit `.env` file
- Put your ACTUAL MySQL root password
- Restart: `npm run dev`

**"Database error: Unknown column"?**
- Just restart: Stop `npm run dev` and run it again
- If still broken, reset database: `mysql -u root -p"" < database_setup_complete.sql`

**Dependencies error?**
```powershell
rm -r node_modules
npm install
```

**"I messed up the database - reset it!"**
```powershell
mysql -u root -p"" < database_setup_complete.sql
npm run dev
```

---

## 📚 More Info

- **README.md** - Project overview
- **PROJECT_STRUCTURE.md** - Folder layout
- **database_setup_complete.sql** - Database schema + sample data (one file!)
