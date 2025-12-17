# Project Structure Overview

```
pp-Att/
├── 📄 Documentation (Read these!)
│   ├── README.md                    ← Start here! Overview of the project
│   ├── TEAM_SETUP.md               ← 3-step quick setup (new members)
│   ├── UPDATE_GUIDE.md             ← How to update code (existing members)
│   ├── SETUP_GUIDE.md              ← Detailed setup with troubleshooting
│   ├── QUICK_REFERENCE.md          ← Copy-paste commands
│   └── READY_FOR_TEAM.md           ← Comprehensive overview
│
├── 🗄️ Configuration Files
│   ├── .env                         ← Database credentials (don't commit!)
│   ├── .env.example                 ← Template for .env
│   ├── .gitignore                   ← Files to ignore in git
│   ├── package.json                 ← Dependencies
│   ├── tsconfig.json                ← TypeScript config
│   ├── vite.config.ts               ← Build config
│   ├── drizzle.config.ts            ← Database ORM config
│   ├── tailwind.config.ts           ← CSS framework config
│   ├── postcss.config.js            ← CSS processor
│   └── components.json              ← UI components config
│
├── 💾 Database & Setup
│   ├── database_setup.sql           ← Run once to create all tables
│   ├── setup.bat                    ← Automated Windows setup script
│   └── migrations/                  ← Database migration files
│
├── 🎨 Frontend (React)
│   └── client/
│       ├── index.html
│       ├── tsconfig.json
│       └── src/
│           ├── main.tsx             ← Entry point
│           ├── App.tsx              ← Main app component
│           ├── index.css            ← Global styles
│           ├── pages/               ← Page components
│           │   ├── login.tsx
│           │   ├── dashboard.tsx
│           │   ├── user-management.tsx
│           │   ├── head-dashboard.tsx
│           │   ├── analytics.tsx
│           │   ├── attendance.tsx
│           │   ├── leave-requests.tsx
│           │   ├── information.tsx
│           │   └── not-found.tsx
│           ├── components/          ← Reusable components
│           │   ├── user-management-table.tsx
│           │   ├── add-user-modal.tsx
│           │   ├── admin-dashboard.tsx
│           │   ├── classes-page.tsx
│           │   ├── config-subjects.tsx
│           │   ├── schedules-page.tsx
│           │   ├── admin-header.tsx
│           │   ├── admin-sidebar.tsx
│           │   ├── dashboards/
│           │   └── ui/              ← UI library components
│           ├── hooks/               ← Custom React hooks
│           ├── lib/                 ← Utilities
│           │   ├── api.ts
│           │   ├── auth.ts
│           │   ├── queryClient.ts
│           │   └── utils.ts
│           └── types/               ← TypeScript types
│               └── index.ts
│
├── 🖥️ Backend (Express)
│   └── server/
│       ├── index.ts                 ← Server entry point
│       ├── routes.ts                ← API endpoints
│       ├── storage.ts               ← Database operations
│       ├── vite.ts                  ← Vite integration
│       └── public/                  ← Static files
│
├── 🔗 Shared
│   └── shared/
│       └── schema.ts                ← Database schema & types
│
├── ✅ Testing
│   ├── tests/
│   │   └── e2e.test.ts
│   └── vitest.config.ts
│
└── .git/                            ← Git repository (auto-created)
```

---

## File Descriptions

### Documentation Files

| File | Purpose | Audience |
|------|---------|----------|
| README.md | Project overview | Everyone |
| TEAM_SETUP.md | Quick 3-step setup | New team members |
| UPDATE_GUIDE.md | How to pull & update | Existing members |
| SETUP_GUIDE.md | Detailed setup + troubleshooting | Everyone with issues |
| QUICK_REFERENCE.md | Copy-paste commands | Quick lookup |
| READY_FOR_TEAM.md | Comprehensive overview | Comprehensive understanding |

### Key Source Files

| File | Purpose |
|------|---------|
| server/routes.ts | All API endpoints (GET, POST, PUT, DELETE) |
| server/storage.ts | Database queries using Drizzle ORM |
| shared/schema.ts | Database schema definition & validation |
| client/src/pages/ | Page components (User Management, Dashboard, etc.) |
| client/src/components/ | Reusable UI components |

### Configuration Files

| File | Purpose |
|------|---------|
| .env | Environment variables (NEVER commit) |
| .gitignore | Files to ignore in git |
| package.json | Project dependencies |
| tsconfig.json | TypeScript settings |
| drizzle.config.ts | Drizzle ORM settings |

---

## Quick Commands

```powershell
# First time setup
.\setup.bat
mysql -u root -p < database_setup.sql

# Daily development
npm run dev

# Update code (existing members)
git pull origin main
npm install
npm run dev

# Build for production
npm run build
npm start
```

---

## Clean & Organized!

✔ No duplicate files
✔ Clear documentation
✔ Organized folder structure
✔ Easy to navigate
✔ Ready for team testing

---
