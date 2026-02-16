# Supabase Setup Instructions

## Step 1: Run SQL Migration

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `migrations/001_initial_schema.sql`
4. Paste and run the SQL in the editor
5. Verify all tables were created successfully

## Step 2: Migrate Existing Data (Optional)

If you have existing data in the Prisma database:

1. Make sure you have your Supabase credentials in `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_key
   ```

2. Run the migration script:
   ```bash
   node supabase/migrate-from-prisma.js
   ```

3. Review the output and save the parent phone mapping
4. Have parents sign up using those phone numbers to link swimmers

## Step 3: Create First Admin User

1. Go to Supabase Authentication in the dashboard
2. Create a new user with your email
3. Go to the SQL Editor and run:
   ```sql
   INSERT INTO profiles (id, full_name, phone_number, role)
   VALUES (
     'USER_ID_FROM_AUTH',
     'Your Name',
     '+254700000000',
     'admin'
   );
   ```

## Row-Level Security (RLS)

All tables have RLS enabled with the following policies:

- **Parents**: Can only view/edit their own profile and swimmers
- **Coaches**: Can view assigned squads and mark attendance
- **Admins**: Full access to all data
- **Public**: Can register new swimmers (pending approval)

## Database Schema

See `migrations/001_initial_schema.sql` for the complete schema.

Key tables:
- `profiles` - User profiles (parent, admin, coach)
- `swimmers` - Swimmer information
- `invoices` & `invoice_line_items` - Payment tracking
- `training_sessions` & `attendance` - Session management
- `meets` & `meet_registrations` - Competition management
