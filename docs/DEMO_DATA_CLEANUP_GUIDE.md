# Demo Data Cleanup Guide

## 🎯 Purpose

Remove all test/demo data from the production database to prepare for real user onboarding.

## 📧 Data to be Removed

### Parent Accounts
- `acwzsr@hi2.in`
- `enbcqbfh@hi2.in`
- `gctmzcr@hi2.in`

### Swimmers (by first name)
- `marlee`
- `turi`

## 🗑️ What Will Be Deleted

The cleanup script will remove:

1. **Attendance Records** - All check-ins for these swimmers
2. **Invoice Line Items** - Detailed invoice entries
3. **Invoices** - Payment records and receipts
4. **Registration Consents** - KDPA consent records
5. **Registrations** - Initial registration submissions
6. **Coach Assignments** - Any coach-swimmer assignments
7. **Swimmers** - Swimmer profiles and data
8. **Profiles** - Parent account profiles
9. **Auth Users** - Authentication records

## 📝 Two Script Options

### Option 1: Safe Version (Recommended)
**File**: `CLEANUP_demo_data.sql`

This version:
- ✅ Shows detailed preview of what will be deleted
- ✅ Uses a transaction (BEGIN...COMMIT)
- ✅ Requires manual COMMIT to apply changes
- ✅ Provides counts and details before deletion
- ✅ Allows ROLLBACK if you change your mind

**Best for**: First-time cleanup, production databases, when you want to verify before deleting.

### Option 2: Direct Version
**File**: `CLEANUP_demo_data_DIRECT.sql`

This version:
- ⚡ Executes immediately
- ⚡ No manual COMMIT needed
- ⚡ Faster for repeated cleanups
- ⚠️ Cannot be undone

**Best for**: Development databases, repeated cleanups, when you're confident about the data.

---

## 🚀 How to Run

### Using Option 1 (Safe Version - Recommended)

1. **Open Supabase Dashboard** → SQL Editor

2. **Copy and paste** the contents of `CLEANUP_demo_data.sql`

3. **Click "Run"** - This will:
   - Start a transaction
   - Show you what will be deleted
   - Perform the deletion
   - **BUT NOT COMMIT YET**

4. **Review the output**:
   ```
   📧 Parents to delete: 3
   🏊 Swimmers to delete: X
   ✅ Attendance records to delete: X
   💰 Invoices to delete: X
   ...
   ```

5. **If everything looks correct**:
   - In the same SQL Editor, type: `COMMIT;`
   - Click "Run"
   - Changes are now permanent

6. **If something looks wrong**:
   - In the same SQL Editor, type: `ROLLBACK;`
   - Click "Run"
   - All changes are undone, database unchanged

### Using Option 2 (Direct Version)

1. **Open Supabase Dashboard** → SQL Editor

2. **Copy and paste** the contents of `CLEANUP_demo_data_DIRECT.sql`

3. **Click "Run"** - Done! All data deleted immediately.

4. **Run verification query** (included at bottom):
   ```sql
   SELECT 
     (SELECT COUNT(*) FROM profiles WHERE email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in')) as remaining_parents,
     (SELECT COUNT(*) FROM swimmers WHERE LOWER(first_name) IN ('marlee', 'turi')) as remaining_swimmers;
   ```
   
   Should return: `remaining_parents: 0, remaining_swimmers: 0`

---

## ✅ Verification Checklist

After running the cleanup, verify:

- [ ] No parents with demo emails exist:
  ```sql
  SELECT * FROM profiles WHERE email IN ('acwzsr@hi2.in', 'enbcqbfh@hi2.in', 'gctmzcr@hi2.in');
  ```
  **Expected**: 0 rows

- [ ] No swimmers named 'marlee' or 'turi':
  ```sql
  SELECT * FROM swimmers WHERE LOWER(first_name) IN ('marlee', 'turi');
  ```
  **Expected**: 0 rows

- [ ] No orphaned attendance records:
  ```sql
  SELECT COUNT(*) FROM attendance a
  WHERE NOT EXISTS (SELECT 1 FROM swimmers s WHERE s.id = a.swimmer_id);
  ```
  **Expected**: 0

- [ ] No orphaned invoices:
  ```sql
  SELECT COUNT(*) FROM invoices i
  WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = i.parent_id);
  ```
  **Expected**: 0

---

## 🔒 Safety Notes

### Before Running
1. **Backup**: Supabase has automatic backups, but verify your backup schedule
2. **Off-Peak**: Run during low-traffic periods
3. **Test First**: Use Option 1 (safe version) with manual COMMIT
4. **Verify Data**: Double-check the email addresses and swimmer names

### During Execution
1. **Don't Close Browser**: Keep the SQL Editor tab open until COMMIT
2. **Monitor Output**: Watch for errors in the console
3. **Transaction Timeout**: If using safe version, don't wait too long between BEGIN and COMMIT

### After Execution
1. **Run Verification Queries**: Confirm data is deleted
2. **Check Application**: Test login, registration, dashboard
3. **Monitor Logs**: Watch for any unexpected errors

---

## 🐛 Troubleshooting

### "Permission denied" error
- **Cause**: Insufficient privileges to delete from `auth.users`
- **Solution**: Remove the `DELETE FROM auth.users` line, or run as superuser

### "Foreign key violation" error
- **Cause**: Deletion order is wrong (trying to delete parent before children)
- **Solution**: The script already handles this, but if you modified it, follow this order:
  1. attendance
  2. invoice_line_items
  3. invoices
  4. registration_consents
  5. registrations
  6. coach_assignments
  7. swimmers
  8. profiles
  9. auth.users

### "Cannot find swimmer 'marlee' or 'turi'"
- **Cause**: Swimmers might have different capitalization or slight spelling differences
- **Solution**: Run this query to find them:
  ```sql
  SELECT first_name, last_name FROM swimmers 
  WHERE first_name ILIKE '%marlee%' OR first_name ILIKE '%turi%';
  ```
  Then adjust the script with exact names.

### Transaction still open (Safe version)
- **Cause**: Ran the safe version but didn't COMMIT or ROLLBACK
- **Solution**: 
  - To apply changes: `COMMIT;`
  - To undo: `ROLLBACK;`
  - To check status: `SELECT txid_current();`

---

## 📊 Expected Results

### Before Cleanup
```
profiles: ~3 demo accounts
swimmers: ~X swimmers (associated + marlee + turi)
attendance: ~X records
invoices: ~X records
registrations: ~X records
```

### After Cleanup
```
profiles: 0 demo accounts
swimmers: 0 swimmers named marlee/turi, 0 orphaned swimmers
attendance: 0 orphaned records
invoices: 0 orphaned records
registrations: 0 orphaned records
```

---

## 🆘 Rollback (Safe Version Only)

If you ran the **safe version** and haven't committed yet:

```sql
ROLLBACK;
```

This will undo ALL changes. The database will be exactly as it was before running the script.

**Note**: Once you run `COMMIT;`, there's no undo! Make sure you're ready before committing.

---

## 📞 Support

**If something goes wrong**:
1. Don't panic - Supabase has backups
2. Run `ROLLBACK;` if using safe version
3. Check Supabase backup/restore options
4. Contact Supabase support if needed

**For questions about the script**:
- Review the SQL comments in the script files
- Check Supabase RLS policies if getting permission errors
- Verify foreign key relationships in database schema

---

## ✨ Post-Cleanup

After successful cleanup:

1. **Test Registration**: Try creating a new parent account
2. **Test Registration**: Register a new swimmer
3. **Test Payment**: Create a test invoice
4. **Test Check-in**: Create a session and check-in
5. **Verify Dashboard**: Ensure parent dashboard loads correctly
6. **Check Admin**: Ensure admin can see all real users (not demo)

---

*Last Updated: February 20, 2026*  
*Status: Ready for Production Cleanup*  
*Always prefer Option 1 (Safe Version) for first-time use!*
