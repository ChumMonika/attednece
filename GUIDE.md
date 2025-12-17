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
```powershell
mysql -u root -p < database_setup.sql
```

### Step 4: Run Project
```powershell
npm run dev
```
Open: **http://localhost:5000**  
Login: `admin` / `admin123`

---

## 📦 Update Existing Project (Existing Members)

Already have the project? Just do this:

```powershell
git pull origin main
npm install
npm run dev
```

Done! That's it! ✅

---

## 🆘 Troubleshooting

**Port 5000 already in use?**
```powershell
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

**MySQL connection failed?**
- Check MySQL is running
- Verify `.env` has correct credentials
- Try: `mysql -u root -p -e "SELECT 1;"`

**Dependencies error?**
```powershell
rm -r node_modules
npm install
```

**Database error?**
```powershell
mysql -u root -p < database_setup.sql
```

---

## 📚 More Info

- **README.md** - Project overview
- **PROJECT_STRUCTURE.md** - Folder layout
