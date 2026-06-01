# Otters Kenya Academy of Swimming - Documentation

## 📚 Quick Navigation

### Getting Started (maintained)
- **[START HERE](START_HERE.md)** - Documentation hub (start here)
- **[Onboarding handouts](onboarding/)** - **Primary** one-page guides for parents, coaches, admins
- **[Parent User Journey](PARENT_USER_JOURNEY.md)** - Extended parent reference (may lag handout)
- **[Admin User Journey](ADMIN_USER_JOURNEY.md)** - Extended admin reference (may lag handout)
- **[Quick Start Guide](QUICK_START.md)** - Technical setup instructions

### Key Features
- **[Check-In System](CHECK_IN_SYSTEM.md)** - How the manual check-in works
- **[Paystack Integration](PAYSTACK_QUICK_START.md)** - Payment gateway setup & testing

### Technical Documentation
- **[Billing automation](BILLING.md)** - Swim year (Sep–Jul), 25th invoices, early bird, cron
- **[Tech stack (verified versions)](TECH_STACK.md)** - Dependencies, services, migration head (096)
- **[Project Structure](PROJECT_STRUCTURE.md)** - Codebase organization
- **[Database Setup](DATABASE_SETUP.md)** - Supabase configuration
- **[RLS Security](RLS_FIX.md)** - Row-level security policies
- **[Vercel / hosting incident response](VERCEL_INCIDENT_RESPONSE.md)** - Secret rotation & verification after provider incidents

### Important Fixes
- **[Session Code Migration](RUN_SESSION_CODE_MIGRATION.md)** - ⚠️ Run this SQL migration
- **[Security Fixes](SECURITY_FIXES.md)** - Database security patches applied
- **[Consent Storage](CONSENT_STORAGE_GUARANTEED.md)** - Zero-tolerance consent recording

### Plans (future work)
- **[Comms Phase 3 enhancements](plans/comms-phase-3-enhancements.md)** - Deferred: attachments, threaded feedback, delegate announcements, club news card (Phases 0–2 + migrations 091–096 are live)
- **[Admin-only coach provisioning](plans/admin-only-coach-provisioning.md)** - Implemented

### Reference
- **[Organization Summary](ORGANIZATION_SUMMARY.md)** - Project overview
- **[Profile Editing](PROFILE_EDITING_FEATURE.md)** - User settings documentation

## 🗂️ Documentation Structure

```
docs/
├── START_HERE.md                 # Documentation hub ⭐
├── onboarding/                   # Maintained one-page handouts ⭐
│   ├── README.md
│   ├── parent-onboarding.md
│   ├── coach-onboarding.md
│   └── admin-onboarding.md
├── PARENT_USER_JOURNEY.md       # Extended parent guide
├── ADMIN_USER_JOURNEY.md         # Extended admin guide
├── CHECK_IN_SYSTEM.md            # Legacy check-in codes (attendance via sessions)
├── PAYSTACK_QUICK_START.md       # Payment setup
├── RUN_SESSION_CODE_MIGRATION.md # Important SQL migration ⚠️
├── QUICK_START.md                # Technical setup
├── PROJECT_STRUCTURE.md          # Code organization
├── plans/                        # Product / implementation plans
│   ├── comms-phase-3-enhancements.md
│   └── admin-only-coach-provisioning.md
└── ARCHIVE/                      # Historical fixes (resolved)
    ├── README.md
    └── [Archived fix docs]
```

## 🚀 For New Users

**Everyone:** Start with → [START HERE](START_HERE.md)

**Parents/Guardians:** → [Parent onboarding handout](onboarding/parent-onboarding.md) (then [Parent User Journey](PARENT_USER_JOURNEY.md) if needed)

**Coaches:** → [Coach onboarding handout](onboarding/coach-onboarding.md)

**Administrators:** → [Admin onboarding handout](onboarding/admin-onboarding.md) (then [Admin User Journey](ADMIN_USER_JOURNEY.md) if needed)

**Developers:** Start with → [Quick Start Guide](QUICK_START.md)

## 🔧 For System Setup

1. Read [Quick Start Guide](QUICK_START.md)
2. Configure [Database Setup](DATABASE_SETUP.md)
3. Run [Session Code Migration](RUN_SESSION_CODE_MIGRATION.md) ⚠️
4. Review [Security Fixes](SECURITY_FIXES.md)
5. Test [Paystack Integration](PAYSTACK_QUICK_START.md)

## 📝 Document Types

- **Journey Docs**: Step-by-step user guides (non-technical)
- **Technical Docs**: Setup and configuration guides
- **Fix Docs**: Specific issue resolutions
- **Migration Docs**: Database changes to run

## 🗄️ Archived Documentation

Historical fixes and diagnostics are in `/docs/ARCHIVE/`
These represent resolved issues kept for reference.

## ❓ Common Questions

**Where do I start as a parent?**
→ [Parent User Journey](PARENT_USER_JOURNEY.md)

**How do I set up check-in?**
→ [Check-In System](CHECK_IN_SYSTEM.md)

**How do payments work?**
→ [Paystack Quick Start](PAYSTACK_QUICK_START.md)

**What SQL migrations do I need to run?**
→ [Session Code Migration](RUN_SESSION_CODE_MIGRATION.md) (most important)

**Where are old fix documents?**
→ `ARCHIVE/` folder (resolved issues)

## 🔐 Security Notes

- ⚠️ Never commit `.env.local` to git (contains secrets)
- ⚠️ Test keys shown in docs are placeholders only
- ⚠️ Replace with real keys in production
- ✅ All database security patches documented in [Security Fixes](SECURITY_FIXES.md)

## 📞 Support

- **Technical Issues**: Check relevant documentation first
- **Feature Questions**: See user journey docs
- **Payment Issues**: Review Paystack documentation
- **System Admin**: Refer to admin journey doc

---

**Last Updated**: May 2026  
**User docs:** Prefer [onboarding handouts](onboarding/) + [START_HERE](START_HERE.md) over older journey-only guidance.
