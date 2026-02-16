# Scripts

Utility scripts for Otters Kenya Swim Club management platform.

## Available Scripts

### Data Migration
- **`migrate-from-prisma.js`** - Migrate existing data from Prisma SQLite to Supabase
  - Migrates swimmers and meets
  - Creates parent profiles from unique phone numbers
  - Links swimmers to parents
  
  **Usage:**
  ```bash
  node scripts/migrate-from-prisma.js
  ```
  
  **Requirements:**
  - Existing Prisma database at `prisma/dev.db`
  - Supabase credentials in `.env.local`
  - Service role key (for bypassing RLS)

## Future Scripts

Additional scripts can be added here for:
- Bulk invoice generation
- Data exports/imports
- Backup utilities
- Test data seeding
