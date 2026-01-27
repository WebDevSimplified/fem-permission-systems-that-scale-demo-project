# Permission Systems Workshop - Demo Application

A Next.js document management application built to teach Role-Based Access Control (RBAC), Attribute-Based Access Control (ABAC), and Relationship-Based Access Control (ReBAC) concepts.

## 📚 Workshop Overview

This project is broken down into different phases which correspond to specific Git branches:

- `1-basic-permissions`
- `2-fix-basic-permission-errors`
- `3-basic-rbac`
- `4-rbac-limits`
- `5-abac-basic`
- `6-abac-advanced`
- `7-casl`

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- **Node.js** v20 or higher
- **Docker** (for running PostgreSQL)
- **Git**
- A code editor (VS Code recommended)

### 1. Clone the Repository

```bash
git clone https://github.com/WebDevSimplified/fem-permission-systems-that-scale-demo-project.git

cd fem-permission-systems-that-scale-demo-project

git checkout 1-basic-permissions
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Database

The project includes a Docker Compose file for PostgreSQL. Start it with:

```bash
docker compose up
```

This will start a PostgreSQL container on port 5432.

> **Don't have Docker?** You can use any PostgreSQL instance. Just update the connection details in your environment variables.

### 4. Configure Environment Variables

Create a `.env` file in the root directory with the following variables if it doesn't already exist:

```text
DB_PASSWORD=password
DB_USER=postgres
DB_NAME=permissions-demo
DB_HOST=localhost
DB_PORT=5432
```

### 5. Run Database Migrations

Apply the database schema using Drizzle:

```bash
npm run db:push
```

### 6. Seed the Database

Populate the database with sample users, projects, and documents:

```bash
npm run db:seed
```

This creates:

- **8 users** across two departments (Engineering and Marketing)
- **5 projects** with different department assignments
- **15+ documents** with various statuses and ownership

### 7. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 8. Verify It Works

You should see a login page with quick-login buttons for different users. Try logging in as different users to see the application from different permission perspectives.

## 📊 Data Model

The application has three main entities with clear relationships:

### Users

Users are the people who interact with the application. Each user has:

| Field        | Description                                                      |
| ------------ | ---------------------------------------------------------------- |
| `id`         | Unique identifier                                                |
| `email`      | Login credential                                                 |
| `name`       | Display name                                                     |
| `role`       | One of: `viewer`, `editor`, `author`, `admin`                    |
| `department` | The department they belong to (e.g., "Engineering", "Marketing") |

### Projects

Projects are containers for documents. They're scoped to departments:

| Field         | Description                                                                          |
| ------------- | ------------------------------------------------------------------------------------ |
| `id`          | Unique identifier                                                                    |
| `name`        | Project name                                                                         |
| `description` | What the project is about                                                            |
| `ownerId`     | The user who created the project                                                     |
| `department`  | The department this project belongs to (can be `null` for cross-department projects) |

### Documents

Documents are the core content of the application:

| Field            | Description                                 |
| ---------------- | ------------------------------------------- |
| `id`             | Unique identifier                           |
| `title`          | Document title                              |
| `content`        | The actual document content                 |
| `status`         | One of: `draft`, `published`, `archived`    |
| `isLocked`       | Whether the document is locked from editing |
| `projectId`      | The project this document belongs to        |
| `creatorId`      | The user who created the document           |
| `lastEditedById` | The user who last modified the document     |

## 🏢 Department Scoping

Users and projects belong to departments. The intended behavior is:

- Users should primarily see and interact with **their department's projects**
- Some projects have `department: null`, meaning they're **cross-department** and all users can access them

## 🔐 Permission Rules

These are the starting permissions for each role:

### Projects

| Role   | View | Create | Edit | Delete |
| ------ | ---- | ------ | ---- | ------ |
| Viewer | ✅   | ❌     | ❌   | ❌     |
| Editor | ✅   | ❌     | ❌   | ❌     |
| Author | ✅   | ❌     | ❌   | ❌     |
| Admin  | ✅   | ✅     | ✅   | ✅     |

- All roles other than `admin` can only view projects with a `department` that matches their own department or with `department: null` (cross-department projects)

### Documents

| Role   | View | Create | Edit | Delete |
| ------ | ---- | ------ | ---- | ------ |
| Viewer | ✅   | ❌     | ❌   | ❌     |
| Editor | ✅   | ❌     | ✅   | ❌     |
| Author | ✅   | ✅     | ✅   | ❌     |
| Admin  | ✅   | ✅     | ✅   | ✅     |

## 📁 Project Structure

Here are the key parts of the codebase:

```text
src/
├── actions/          # Server actions (form submissions)
│   ├── auth.ts       # Authentication actions
│   ├── documents.ts  # Document CRUD operations
│   └── projects.ts   # Project CRUD operations
├── app/              # Next.js app router pages
│   ├── (dashboard)/  # Protected dashboard routes
│   └── page.tsx      # Login page
├── dal/              # Data access layer
│   ├── documents/    # Document queries and mutations
│   ├── projects/     # Project queries and mutations
│   └── users/        # User queries
├── drizzle/          # Database schema and migrations
│   ├── schema/       # Entity schemas
│   ├── db.ts         # Database connection
│   └── seed.ts       # Sample data seeding
└── components/       # React components
    ├── app-sidebar.tsx
    ├── document-form.tsx
    ├── project-form.tsx
    └── ui/           # shadcn/ui components
```

## 🛠️ Troubleshooting

### Database connection errors

Make sure Docker is running and the PostgreSQL container is up:

```bash
docker compose ps
```

### Port conflicts

If port 5432 is already in use, update the port in your `.env` file.

### Seed script fails

Make sure you've run the migrations first:

```bash
npm run db:push
```

## 🧪 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:push` - Push schema changes to database
- `npm run db:seed` - Seed database with sample data
- `npm run db:studio` - Open Drizzle Studio (database GUI)
