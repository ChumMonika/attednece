# Setup & Update Guide

## 🆕 First Time Setup
### Step 1: Clone Project if not yet
```powershell
git clone https://github.com/ChumMonika/attednece.git
cd attednece
npm install
```

### Step 2: Create `.env` File if not have
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
mysql -u root -p < database_setup.sql
```
(Just paste your password when prompted - only ONCE)

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

**Your `.env` file stays the same!** Don't change it. Just pull, install, and run!

Done! That's it! ✅

---

**"Database error: Unknown column"?**
- Database schema might not be synced
- Try restarting: Stop `npm run dev` and run it again
- Or reset database: `mysql -u root -p"" < database_setup.sql`
- Then: `npm run dev`
- Your `.env` password is WRONG
- Edit `.env` file and put your ACTUAL MySQL root password
- Restart: `npm run dev`

**Forgot MySQL root password?**
- Stop MySQL: `net stop MySQL80`
- Restart without password: `mysqld --skip-grant-tables`
- In another terminal: `mysql -u root`
- Run: `FLUSH PRIVILEGES; ALTER USER 'root'@'localhost' IDENTIFIED BY 'newpassword';`

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
