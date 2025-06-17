# BlogSphere - A Modern Blogging Platform

## Overview

BlogSphere is a full-stack blogging platform built with React, Express, and PostgreSQL. It provides a social blogging experience with features like post creation, user authentication, likes, comments, bookmarks, and user profiles. The application follows a modern tech stack with TypeScript throughout and uses shadcn/ui for a polished UI experience.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter for client-side routing
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state management
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based authentication using express-session
- **Password Security**: bcrypt for password hashing
- **API Design**: RESTful API endpoints

### Data Storage Solutions
- **Primary Database**: PostgreSQL (configured for Neon Database)
- **ORM**: Drizzle ORM with type-safe queries
- **Session Storage**: PostgreSQL-based session storage using connect-pg-simple
- **Migrations**: Drizzle Kit for database schema management

### Deployment Strategy
- **Platform**: Replit with autoscale deployment
- **Development**: Hot reloading with Vite and tsx
- **Production**: ESBuild for server bundling, Vite for client build
- **Environment**: Node.js 20 with PostgreSQL 16

## Key Components

### Database Schema
The application uses a comprehensive schema with the following main entities:
- **Users**: Authentication and profile information
- **Posts**: Blog content with metadata (title, content, excerpt, tags, images)
- **Likes**: User engagement tracking
- **Comments**: Post discussions
- **Bookmarks**: User-saved content
- **Follows**: User relationships (schema prepared but not fully implemented)

### Authentication System
- Session-based authentication with secure cookie handling
- Password hashing using bcrypt
- Session persistence across browser restarts
- Role-based access for content creation and management

### Content Management
- Rich post creation with tag support
- Image upload capabilities
- Content search and filtering
- Tag-based content discovery
- User-generated content with author attribution

### Social Features
- Like/unlike posts
- Comment system with nested discussions
- Bookmark functionality for saving posts
- User profiles with follow system (partially implemented)
- Activity tracking and engagement metrics

### UI/UX Components
- Responsive design with mobile-first approach
- Dark/light mode support via CSS variables
- Accessible components using Radix UI primitives
- Toast notifications for user feedback
- Modal dialogs for content creation and authentication
- Infinite scroll and pagination support

## Data Flow

### Client-Server Communication
1. React frontend communicates with Express backend via RESTful APIs
2. TanStack Query manages server state with automatic caching and invalidation
3. Session cookies maintain authentication state
4. Real-time updates through optimistic UI updates

### Database Operations
1. Drizzle ORM provides type-safe database queries
2. Connection pooling through Neon Database serverless driver
3. Automatic schema migrations via Drizzle Kit
4. Transactional operations for data consistency

### Authentication Flow
1. User credentials validated against bcrypt-hashed passwords
2. Express sessions created and stored in PostgreSQL
3. Session cookies transmitted with httpOnly security
4. Frontend receives user data through authenticated endpoints

## External Dependencies

### Database
- **Neon Database**: Serverless PostgreSQL provider
- **Drizzle ORM**: Type-safe database toolkit
- **connect-pg-simple**: PostgreSQL session store

### UI Framework
- **shadcn/ui**: Component library built on Radix UI
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library

### Development Tools
- **Vite**: Frontend build tool with HMR
- **ESBuild**: Fast JavaScript bundler for production
- **TypeScript**: Type safety across the entire stack
- **React Hook Form**: Form state management
- **Zod**: Runtime type validation

### Authentication & Security
- **bcrypt**: Password hashing
- **express-session**: Session management
- **CORS**: Cross-origin resource sharing

## Deployment Strategy

### Development Environment
- Replit workspace with Node.js 20 and PostgreSQL 16
- Hot module replacement for rapid development
- Automatic dependency installation and environment setup
- Integrated database provisioning

### Production Deployment
- Autoscale deployment target for dynamic scaling
- Client-side assets served as static files
- Server-side rendering disabled for SPA architecture
- Environment variables for database connection and session secrets

### Build Process
1. Client build: Vite compiles React application to static assets
2. Server build: ESBuild bundles Express server for production
3. Database setup: Drizzle migrations ensure schema consistency
4. Asset optimization: Automatic minification and tree-shaking

## Changelog

```
Changelog:
- June 17, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```