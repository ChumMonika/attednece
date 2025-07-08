# University Staff Attendance System

## Overview

A full-stack University Staff Attendance System built with a Node.js/Express backend and React/TypeScript frontend. The system supports role-based access control for different types of university staff including heads, administrators, mazers, assistants, teachers, and staff members. Each role has specific permissions and interfaces tailored to their responsibilities in managing attendance and leave requests.

## System Architecture

The application follows a traditional client-server architecture with clear separation between frontend and backend concerns:

- **Frontend**: React with TypeScript, using modern development practices
- **Backend**: Node.js with Express.js as the web framework
- **Database**: PostgreSQL with Drizzle ORM for database operations
- **Session Management**: Express sessions for authentication state
- **Build System**: Vite for frontend development and bundling

## Key Components

### Frontend Architecture
- **React Router**: Implemented using Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Express.js Server**: RESTful API with middleware for session management and logging
- **Authentication**: Session-based authentication with role-based access control
- **Data Layer**: Drizzle ORM with PostgreSQL for data persistence
- **Memory Storage**: Fallback in-memory storage implementation for development

### Database Schema
The system uses three main entities:
- **Users**: Stores user information including unique IDs, roles, schedules, and authentication data
- **Attendance**: Tracks daily attendance records with status (present/absent/leave) and timestamps
- **Leave Requests**: Manages leave applications with approval workflow

### Role-Based Dashboards
- **Head**: View all attendance data and approve/reject leave requests
- **Admin**: Manage user accounts (CRUD operations)
- **Mazer**: Mark teacher attendance with subject and time scheduling
- **Assistant**: Mark staff attendance with work type categorization
- **Teacher/Staff**: View personal attendance history and submit leave requests

## Data Flow

1. **Authentication Flow**: Users log in with unique ID and password, establishing a server-side session
2. **Role Routing**: After authentication, users are redirected to role-specific dashboards
3. **Data Fetching**: React Query manages API calls with automatic caching and revalidation
4. **Real-time Updates**: Optimistic updates provide immediate UI feedback while server requests process
5. **Session Management**: Express sessions maintain authentication state across requests

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: Neon PostgreSQL serverless driver for cloud database connectivity
- **drizzle-orm** & **drizzle-kit**: Modern TypeScript ORM with schema migration tools
- **@tanstack/react-query**: Advanced data fetching and state management
- **wouter**: Minimalist router for React applications

### UI and Styling
- **@radix-ui/***: Accessible, unstyled UI component primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant API for Tailwind
- **lucide-react**: Consistent icon library

### Development Tools
- **vite**: Fast build tool and development server
- **tsx**: TypeScript execution environment for Node.js
- **@replit/vite-plugin-***: Replit-specific development enhancements

## Deployment Strategy

The application is designed for deployment on Replit with the following build process:

1. **Development**: Vite dev server with hot module replacement for frontend development
2. **Backend Development**: tsx for TypeScript execution with automatic restarts
3. **Production Build**: 
   - Frontend: Vite builds React app to static files
   - Backend: esbuild bundles server code for Node.js runtime
4. **Database**: PostgreSQL database with Drizzle migrations for schema management
5. **Environment**: Environment variables for database connection and session secrets

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

Changelog:
- July 08, 2025. Initial setup