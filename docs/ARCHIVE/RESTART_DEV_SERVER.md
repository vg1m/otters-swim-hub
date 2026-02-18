# 🔄 Restart Dev Server to Load New Consent Verification

## Issue
File lock preventing build. Need to restart dev server.

## Steps

### 1. Stop Dev Server
In your terminal where `npm run dev` is running:
- Press `Ctrl + C`
- Wait for it to stop

### 2. Start Dev Server Again
```bash
npm run dev
```

### 3. Test Registration Again
1. Go to `http://localhost:3000/register`
2. Fill out form (1 swimmer, check all consents)
3. Choose "Pay Later"
4. Submit

### 4. Watch Terminal Output

You should now see **MUCH MORE detail**:

```
Preparing to store consent records...
Consent values: { dataAccuracy: true, codeOfConduct: true, mediaConsent: true }
CONSENT_POLICY_TEXT available: true
Inserting consent records: 1
Sample consent record: {
  "parent_id": null,
  "swimmer_id": "xxx-xxx-xxx",
  "media_consent": true,
  "code_of_conduct_consent": true,
  "data_accuracy_confirmed": true,
  "consent_text": "By registering with Otters...",
  "ip_address": "...",
  "user_agent": "..."
}
✅ Consent records stored successfully: 1
✅ Inserted consent IDs: [ 'consent-id-xxx' ]
✅ First consent details: { ... }
✅ Verification: Found 1 consents in database immediately after insert
```

**OR** if the mystery continues:
```
✅ Consent records stored successfully: 1
✅ Inserted consent IDs: [ 'consent-id-xxx' ]
✅ Verification: Found 0 consents in database immediately after insert
🚨 CRITICAL: Consents inserted but NOT found in database! Data is vanishing!
```

### 5. Then Run This SQL IMMEDIATELY

Right after the registration, run this in Supabase Dashboard:

```sql
-- Check for consents created in last minute
SELECT 
  rc.id,
  rc.swimmer_id,
  rc.created_at,
  s.first_name || ' ' || s.last_name as swimmer_name
FROM registration_consents rc
LEFT JOIN swimmers s ON s.id = rc.swimmer_id
WHERE rc.created_at > NOW() - INTERVAL '1 minute'
ORDER BY rc.created_at DESC;
```

## What This Will Tell Us

**Scenario A:** Verification shows `1` consent found
- ✅ Data IS persisting
- Problem is with the SQL query timing or connection
- Need to check Supabase project URL

**Scenario B:** Verification shows `0` consents found
- 🚨 Data is being inserted then immediately deleted/rolled back
- Need to check for triggers or cascade deletes
- Possible transaction issue

## Share Results

Please share:
1. The FULL terminal output after registration
2. The SQL query results
