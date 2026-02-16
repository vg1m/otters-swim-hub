# Otters Kenya Swim Club Management Platform

A modern, mobile-first Progressive Web App for managing swim club operations including registration, payments, attendance tracking, and meet coordination.

## 📖 Documentation

**→ See [`/docs`](./docs) folder for detailed documentation:**
- **[Quick Start Guide](./docs/QUICK_START.md)** - Setup steps & feature overview
- **[Implementation Details](./docs/IMPLEMENTATION_COMPLETE.md)** - Complete technical documentation
- **[Supabase Setup](./docs/SUPABASE_SETUP.md)** - Database configuration

## Features

- **Online Registration**: Multi-swimmer registration with M-Pesa STK Push payment
- **Attendance Management**: QR code-based check-in system with coach override
- **Payment Tracking**: Simple invoice system (Draft, Issued, Due, Paid)
- **Admin Dashboard**: Comprehensive management interface
- **Parent Portal**: View swimmers, attendance, and invoices
- **Meet Management**: Competition registration and coordination
- **PWA Support**: Installable on mobile devices, works offline

## Tech Stack

- **Frontend**: Next.js 16, React 18, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Payments**: Paystack integration (M-Pesa alternative)
- **Hosting**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase project
- Paystack API credentials

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd otters-swim-hub
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   
   Copy `.env.local.example` to `.env.local` and fill in your credentials:
   ```bash
   cp .env.local.example .env.local
   ```

   Update the following:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
   - Paystack credentials (for payment integration)

4. Set up the database:
   
   a. Go to your Supabase project dashboard
   b. Navigate to SQL Editor
   c. Copy and run the SQL from `supabase/migrations/001_initial_schema.sql`

5. (Optional) Migrate existing data:
   
   If you have data in the old Prisma database:
   ```bash
   node scripts/migrate-from-prisma.js
   ```

6. Run the development server:
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
otters-swim-hub/
├── app/                    # Next.js app directory
│   ├── page.js            # Landing page
│   ├── layout.js          # Root layout
│   ├── globals.css        # Global styles
│   ├── login/             # Login page
│   ├── signup/            # Signup page
│   ├── register/          # Registration flow
│   ├── dashboard/         # Parent dashboard
│   ├── swimmers/          # Swimmer profiles
│   ├── invoices/          # Invoice viewing
│   ├── check-in/          # QR check-in
│   ├── admin/             # Admin routes
│   │   ├── registrations/ # Pending approvals
│   │   ├── swimmers/      # Swimmer management
│   │   ├── sessions/      # Training scheduler
│   │   └── invoices/      # Invoice management
│   └── api/               # API routes (payments, auth)
├── components/            # React components
│   ├── ui/               # UI components (Button, Card, etc.)
│   ├── Navigation.jsx    # Main navigation
│   └── Footer.jsx        # Footer
├── lib/                   # Library code
│   ├── supabase/         # Supabase client & middleware
│   ├── mpesa/            # Payment integration (→ Paystack)
│   └── utils/            # Utility functions
├── hooks/                 # Custom React hooks
├── docs/                  # 📚 All documentation
├── scripts/               # 🛠️ Utility scripts
├── supabase/             # Database migrations
├── public/               # Static files (icons, manifest)
└── next.config.js        # Next.js configuration
```

## Configuration

### Supabase Setup

1. Create a new Supabase project
2. Run the migration SQL from `supabase/migrations/001_initial_schema.sql`
3. Create your first admin user:
   ```sql
   INSERT INTO profiles (id, full_name, phone_number, role)
   VALUES (
     'USER_ID_FROM_AUTH_TABLE',
     'Your Name',
     '+254700000000',
     'admin'
   );
   ```

### M-Pesa Configuration

For testing, use M-Pesa Sandbox:
1. Sign up at [Safaricom Developer Portal](https://developer.safaricom.co.ke/)
2. Create a new app
3. Get your Consumer Key and Consumer Secret
4. Use sandbox shortcode: `174379`
5. Update `.env.local` with your credentials

For production, follow the M-Pesa Go-Live process.

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

The app will be live at your Vercel URL.

### Environment Variables for Production

Make sure to set all environment variables in your Vercel project:
- Supabase credentials
- M-Pesa production credentials
- Update `MPESA_CALLBACK_URL` to your production URL
- Set `MPESA_ENVIRONMENT=production`

## Development

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build
npm start
```

## Features Documentation

### For Parents

- Register multiple swimmers in one transaction
- Pay registration fees via M-Pesa
- View swimmer profiles and attendance
- Check in swimmers at training sessions using QR codes
- View and pay invoices
- Register for competitions

### For Admins

- Approve pending registrations
- Manage all swimmers
- Create training sessions and generate QR codes
- Generate and track invoices
- View payment reports
- Manage swim meets

### For Coaches

- Mark attendance manually
- View assigned squads
- Override self-check-ins

## Security

- Row-Level Security (RLS) enabled on all tables
- Role-based access control (Parent, Coach, Admin)
- Secure M-Pesa webhook validation
- Environment variables for sensitive data

## Support

For issues or questions, contact the development team.

## License

Proprietary - Otters Kenya Swim Club

---

Built with ❤️ for Otters Kenya Swim Club
