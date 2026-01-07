import "dotenv/config"
import { db } from "./db"
import { UserTable, DocumentTable, ProjectTable } from "./schema"

async function seed() {
  console.log("🌱 Seeding database...")

  // Clear existing data
  await db.delete(DocumentTable)
  await db.delete(ProjectTable)
  await db.delete(UserTable)
  console.log("✓ Cleared existing data")

  // Create users across different roles and departments
  const users = await db
    .insert(UserTable)
    .values([
      // Engineering Department
      {
        email: "admin.eng@example.com",
        name: "Alice Admin",
        role: "admin",
        department: "Engineering",
      },
      {
        email: "author.eng@example.com",
        name: "Bob Author",
        role: "author",
        department: "Engineering",
      },
      {
        email: "editor.eng@example.com",
        name: "Charlie Editor",
        role: "editor",
        department: "Engineering",
      },
      {
        email: "viewer.eng@example.com",
        name: "Diana Viewer",
        role: "viewer",
        department: "Engineering",
      },

      // Marketing Department
      {
        email: "admin.marketing@example.com",
        name: "Eve Admin",
        role: "admin",
        department: "Marketing",
      },
      {
        email: "author.marketing@example.com",
        name: "Frank Author",
        role: "author",
        department: "Marketing",
      },
      {
        email: "editor.marketing@example.com",
        name: "Grace Editor",
        role: "editor",
        department: "Marketing",
      },
      {
        email: "viewer.marketing@example.com",
        name: "Henry Viewer",
        role: "viewer",
        department: "Marketing",
      },
    ])
    .returning()

  console.log(`✓ Created ${users.length} users across 2 departments`)

  // Helper to get user by email
  const getUser = (email: string) => users.find(u => u.email === email)!

  // Create projects
  const projects = await db
    .insert(ProjectTable)
    .values([
      // Engineering Projects
      {
        name: "API Documentation",
        description:
          "Technical documentation for our REST API - Engineering only",
        ownerId: getUser("admin.eng@example.com").id,
        department: "Engineering",
      },
      {
        name: "System Architecture",
        description: "High-level system design documents",
        ownerId: getUser("author.eng@example.com").id,
        department: "Engineering",
      },

      // Marketing Projects
      {
        name: "Brand Guidelines",
        description: "Company branding and style guide",
        ownerId: getUser("admin.marketing@example.com").id,
        department: "Marketing",
      },
      {
        name: "Campaign Plans",
        description: "Marketing campaign strategies and plans",
        ownerId: getUser("author.marketing@example.com").id,
        department: "Marketing",
      },

      // Cross-department Project
      {
        name: "Company Wiki",
        description: "General knowledge base for all departments",
        ownerId: getUser("admin.eng@example.com").id,
        department: null, // Cross-department
      },
    ])
    .returning()

  console.log(`✓ Created ${projects.length} projects`)

  // Helper to get project by name
  const getProject = (name: string) => projects.find(p => p.name === name)!

  // Create documents with various attribute combinations
  const documents = await db
    .insert(DocumentTable)
    .values([
      // API Documentation Project - Various states for permission testing
      {
        title: "Getting Started Guide",
        content: "# Getting Started\n\nWelcome to our API...",
        status: "published",
        isLocked: false,
        projectId: getProject("API Documentation").id,
        creatorId: getUser("author.eng@example.com").id,
        lastEditedById: getUser("editor.eng@example.com").id,
      },
      {
        title: "Authentication Flow (Draft)",
        content: "# Authentication\n\nWork in progress...",
        status: "draft",
        isLocked: false,
        projectId: getProject("API Documentation").id,
        creatorId: getUser("author.eng@example.com").id,
        lastEditedById: getUser("author.eng@example.com").id,
      },
      {
        title: "API v1 Reference (Archived)",
        content: "# API v1\n\nDeprecated - use v2 instead",
        status: "archived",
        isLocked: true,
        projectId: getProject("API Documentation").id,
        creatorId: getUser("admin.eng@example.com").id,
        lastEditedById: getUser("admin.eng@example.com").id,
      },
      {
        title: "Endpoints Reference",
        content: "# Endpoints\n\nList of all API endpoints...",
        status: "published",
        isLocked: true, // Published but locked for editing
        projectId: getProject("API Documentation").id,
        creatorId: getUser("admin.eng@example.com").id,
        lastEditedById: getUser("editor.eng@example.com").id,
      },

      // System Architecture Project
      {
        title: "Database Schema Design",
        content: "# Database Design\n\nOur PostgreSQL schema...",
        status: "draft",
        isLocked: false,
        projectId: getProject("System Architecture").id,
        creatorId: getUser("author.eng@example.com").id,
        lastEditedById: getUser("author.eng@example.com").id,
      },
      {
        title: "Microservices Overview",
        content: "# Microservices\n\nOur service architecture...",
        status: "published",
        isLocked: false,
        projectId: getProject("System Architecture").id,
        creatorId: getUser("author.eng@example.com").id,
        lastEditedById: getUser("author.eng@example.com").id,
      },

      // Brand Guidelines Project
      {
        title: "Logo Usage",
        content: "# Logo Guidelines\n\nHow to use our logo...",
        status: "published",
        isLocked: false,
        projectId: getProject("Brand Guidelines").id,
        creatorId: getUser("author.marketing@example.com").id,
        lastEditedById: getUser("editor.marketing@example.com").id,
      },
      {
        title: "Color Palette",
        content: "# Colors\n\nPrimary: #FF6B6B...",
        status: "published",
        isLocked: true,
        projectId: getProject("Brand Guidelines").id,
        creatorId: getUser("admin.marketing@example.com").id,
        lastEditedById: getUser("admin.marketing@example.com").id,
      },
      {
        title: "Typography Guide (Draft)",
        content: "# Typography\n\nFonts and text styles...",
        status: "draft",
        isLocked: false,
        projectId: getProject("Brand Guidelines").id,
        creatorId: getUser("author.marketing@example.com").id,
        lastEditedById: getUser("author.marketing@example.com").id,
      },

      // Campaign Plans Project
      {
        title: "Q1 2026 Campaign",
        content: "# Q1 Campaign\n\nGoals and strategies...",
        status: "published",
        isLocked: false,
        projectId: getProject("Campaign Plans").id,
        creatorId: getUser("author.marketing@example.com").id,
        lastEditedById: getUser("editor.marketing@example.com").id,
      },
      {
        title: "Q4 2025 Retrospective",
        content: "# Q4 Results\n\nWhat went well...",
        status: "archived",
        isLocked: false,
        projectId: getProject("Campaign Plans").id,
        creatorId: getUser("admin.marketing@example.com").id,
        lastEditedById: getUser("admin.marketing@example.com").id,
      },
      {
        title: "Social Media Strategy",
        content: "# Social Media\n\nPlatform-specific tactics...",
        status: "published",
        isLocked: false,
        projectId: getProject("Campaign Plans").id,
        creatorId: getUser("author.marketing@example.com").id,
        lastEditedById: getUser("editor.marketing@example.com").id,
      },
      {
        title: "Email Campaign Templates (Draft)",
        content: "# Email Templates\n\nReusable email designs...",
        status: "draft",
        isLocked: false,
        projectId: getProject("Campaign Plans").id,
        creatorId: getUser("author.marketing@example.com").id,
        lastEditedById: getUser("author.marketing@example.com").id,
      },

      // Company Wiki - Cross-department
      {
        title: "Company History",
        content: "# Our Story\n\nFounded in 2020...",
        status: "published",
        isLocked: false,
        projectId: getProject("Company Wiki").id,
        creatorId: getUser("admin.eng@example.com").id,
        lastEditedById: getUser("admin.eng@example.com").id,
      },
      {
        title: "Office Locations",
        content: "# Offices\n\nSan Francisco, New York, London...",
        status: "published",
        isLocked: false,
        projectId: getProject("Company Wiki").id,
        creatorId: getUser("author.marketing@example.com").id,
        lastEditedById: getUser("editor.marketing@example.com").id,
      },
      {
        title: "Team Directory (Draft)",
        content: "# Directory\n\nWho's who in the company...",
        status: "draft",
        isLocked: false,
        projectId: getProject("Company Wiki").id,
        creatorId: getUser("author.eng@example.com").id,
        lastEditedById: getUser("author.eng@example.com").id,
      },
      {
        title: "FAQ (Archived)",
        content: "# FAQ\n\nOld frequently asked questions...",
        status: "archived",
        isLocked: true,
        projectId: getProject("Company Wiki").id,
        creatorId: getUser("admin.marketing@example.com").id,
        lastEditedById: getUser("admin.marketing@example.com").id,
      },
    ])
    .returning()

  console.log(`✓ Created ${documents.length} documents`)
  console.log("\n📊 Seed Summary:")
  console.log(`   - Users: ${users.length}`)
  console.log(`   - Projects: ${projects.length}`)
  console.log(`   - Documents: ${documents.length}`)
  console.log("\n✅ Database seeded successfully!")
}

seed()
  .catch(error => {
    console.error("❌ Error seeding database:", error)
    process.exit(1)
  })
  .then(() => {
    process.exit(0)
  })
