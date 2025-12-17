# 🚀 Quick Start Guide - University Attendance System

## ⚡ Getting Started (5 minutes)

### 1. Start the Server
```powershell
npm run dev
```

### 2. Open Browser
```
http://localhost:5000
```

### 3. Login
- **Username**: `admin001`
- **Password**: `admin123`

---

## 📍 Main Features

### 👥 User Management
- Navigate: Dashboard → Users
- **Actions**: Add, Edit, Delete users
- **Roles**: Admin, Teacher, Head, HR Assistant, Moderator
- **Auto-generate**: Unique ID, Email, Password

### 🏫 Classes (Academic Setup)
- Navigate: Dashboard → Academic Setup → Classes
- **Display**: Compact format (e.g., `DSE Y2S2 M1`)
- **Features**: 
  - Sort by Year, Semester, Group
  - Pagination (10 items per page)
  - Hover tooltip shows full class name

### 📅 Schedules
- Navigate: Dashboard → Academic Setup → Schedules
- **Hierarchy**: Major → Classes → Schedules
- **Filters**: Major, Year (1-4), Semester (1-2), Class
- **Features**:
  - Collapsible class sections
  - Conflict detection (teacher + class)
  - Bulk creation support
  - Edit/Delete individual schedules

### 📚 Subjects
- Navigate: Dashboard → Academic Setup → Subjects
- **Actions**: Add, Edit, Delete subjects
- **Pagination**: Consistent format

### 🏢 Departments & Majors
- Navigate: Dashboard → Configuration → Departments/Majors
- **Setup**: Department → Major → Class hierarchy

---

## 🎨 UI Features

### Compact Class Labels
- **Format**: `[MAJOR] Y[year]S[semester] M[group]`
- **Examples**:
  - `DSE Y2S2 M1` = Data Science Engineering, Year 2 Semester 2, Group M1
  - `BDSE Y3S1 M2` = Bachelor of Data Science Engineering, Year 3 Semester 1, Group M2

### Filters (Schedules Page)
Located in blue header (right side):
- **Major**: Filter by department/program
- **Year**: All, 1, 2, 3, 4
- **Semester**: All, 1, 2
- **Class**: Filter by specific class

### Pagination
- **Format**: "Showing X to Y of Z items"
- **Navigation**: Previous | Next buttons
- **Per Page**: 10 items (default)

---

## 🔧 Common Tasks

### Add a New Class
1. Go to Classes page
2. Click "Add Class" (green button)
3. Select Major, Year, Semester
4. Enter Academic Year (e.g., 2024-2025)
5. Enter Group (e.g., M1, M2)
6. Click "Save"

### Create Schedule
1. Go to Schedules page
2. Click "Add Schedule" (green button)
3. Select:
   - **Class**: Which class this schedule is for
   - **Subject**: What subject to teach
   - **Teacher**: Who will teach
   - **Day**: Monday-Saturday
   - **Time**: Start time - End time
   - **Room**: Classroom number
4. Click "Save"
5. System validates:
   - Teacher not double-booked
   - Class not double-booked
   - No duplicate entries

### Bulk Create Schedules
1. Click "Bulk Create" on Schedules page
2. Fill in multiple schedule rows
3. Click "Save All"
4. System validates all entries before saving

### Edit User
1. Go to User Management
2. Click Edit icon (pencil) on user row
3. Modify fields
4. Click "Update User"

---

## ⚠️ Validation Rules

### Schedules
- ✅ Teacher can't be in two places at same time
- ✅ Class can't have two subjects at same time
- ✅ No duplicate schedule entries
- ✅ All required fields must be filled

### Users
- ✅ Unique ID must be unique
- ✅ Email must be valid format
- ✅ Password auto-generated (8 characters)
- ✅ Role-specific fields (e.g., Teacher needs classId)

### Classes
- ✅ One group per year/semester/major combination
- ✅ Academic year format: YYYY-YYYY

---

## 🎯 Tips & Tricks

### Navigation
- Use sidebar for main navigation
- Use filters to narrow down data
- Sort columns by clicking headers (where available)

### Search
- Use search box on User Management
- Searches: Name, Unique ID, Email

### Tooltips
- Hover over class labels to see full name
- Hover over major headers to see full department name

### Collapsible Sections
- Click chevron icon (▼/▶) to expand/collapse class schedules
- Saves screen space for large datasets

---

## 📊 Page Reference

| Page | Path | Purpose |
|------|------|---------|
| Dashboard | `/dashboard` | Main overview |
| User Management | `/user-management` | Add/Edit/Delete users |
| Classes | `/classes` | Manage academic classes |
| Schedules | `/schedules` | Manage class schedules |
| Subjects | `/subjects` | Configure subjects |
| Departments | `/departments` | Configure departments |
| Majors | `/majors` | Configure majors/programs |

---

## 🆘 Troubleshooting

### Can't Login
- Check username/password (case-sensitive)
- Default admin: `admin001` / `admin123`

### Filters Not Working
- Refresh page
- Check if data exists for selected filter
- Try "All" option to reset filter

### Schedule Conflict Error
- Check teacher's existing schedules
- Check class's existing schedules
- Ensure time slots don't overlap

### Page Not Loading
- Check server is running (`npm run dev`)
- Check browser console for errors
- Clear browser cache

---

## 📝 Need Help?

1. Check `README.md` for setup instructions
2. Check `TESTING_GUIDE.md` for testing procedures
3. Check `FINAL_STATUS.md` for complete feature list
4. Check browser console for error messages

---

**Status**: ✅ All systems operational  
**Version**: Production Ready (January 2025)
