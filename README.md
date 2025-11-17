# Funnel Maker 🚀

A comprehensive SaaS platform for building, managing, and optimizing sales funnels with AI-powered content generation, real-time collaboration, team management, and advanced analytics.

![Next.js](https://img.shields.io/badge/Next.js-15-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green) ![Stripe](https://img.shields.io/badge/Stripe-Payments-purple)

## ✨ Key Features

### 🎨 Core Functionality
- **Drag-and-Drop Builder** - Visual funnel creation with sortable steps
- **Analytics Dashboard** - Track views, conversions, and ROI
- **Template Library** - Pre-built funnels for common use cases
- **Responsive Design** - Works perfectly on all devices
- **Secure Authentication** - Email/password via Supabase Auth

### 🤖 AI-Powered
- **Content Generation** - GPT-4 powered copywriting for funnel steps
- **Funnel Ideas** - AI suggests complete funnel strategies
- **Smart Optimization** - AI rewrites content for better conversion

### 👥 Team Collaboration
- **Organizations** - Create teams and manage members
- **Role-Based Access** - Owner, Admin, Member permissions
- **Team Invitations** - Invite colleagues via email
- **Real-time Sync** - See collaborators editing live
- **Presence Indicators** - Know who's online

### 💳 Subscription Billing
- **Stripe Integration** - Secure payment processing
- **Three Plans** - Free, Pro ($29/mo), Enterprise ($99/mo)
- **Usage Limits** - Funnel limits per plan
- **Customer Portal** - Self-service subscription management

### 🌐 Sharing & Export
- **Public Links** - Share funnels without authentication
- **HTML Export** - Download complete, ready-to-deploy HTML
- **Email Delivery** - Automatic welcome and export emails

## 🛠️ Technology Stack

**Frontend**
- Next.js 15 (App Router)
- React 19
- TypeScript 5
- TailwindCSS
- Shadcn UI + Radix UI

**Backend**
- Next.js API Routes
- Supabase (PostgreSQL)
- Supabase Auth
- Supabase Realtime
- Row Level Security (RLS)

**Integrations**
- Stripe (Payments)
- Resend (Emails)
- OpenAI GPT-4 (AI)

**Libraries**
- dnd-kit (Drag & Drop)
- Recharts (Charts)
- JSZip (Export)

## 📋 Prerequisites

- Node.js 18+
- npm/yarn
- Supabase account (free tier)
- Stripe account (test mode)
- Resend account (free tier)
- OpenAI API key

## 🚀 Installation

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd funnel-maker
npm install
```

### 2. Environment Variables

```bash
cp .env.local.example .env.local
```

Configure all required variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxx

# Resend
RESEND_API_KEY=re_xxx

# OpenAI
OPENAI_API_KEY=sk-xxx
```

### 3. Database Setup

1. Create Supabase project
2. Run `supabase-schema.sql` in SQL Editor
3. (Optional) Run `supabase/seed.sql` for demo data
4. Enable Realtime for `funnels` table

### 4. Stripe Configuration

1. Create products (Pro: $29/mo, Enterprise: $99/mo)
2. Copy Price IDs to `.env.local`
3. Set up webhooks:

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

### 5. Start Development

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
funnel-maker/
├── app/
│   ├── api/                 # API routes
│   │   ├── ai/             # AI generation
│   │   ├── billing/        # Stripe integration
│   │   ├── emails/         # Email sending
│   │   ├── funnels/        # Funnel CRUD + export
│   │   ├── organizations/  # Team management
│   │   └── public/         # Public access
│   ├── auth/               # Login/register
│   ├── dashboard/          # Protected pages
│   │   ├── funnels/       # Funnel builder
│   │   ├── organizations/ # Team pages
│   │   └── billing/       # Subscription
│   ├── public/            # Public funnel viewer
│   ├── templates/         # Template gallery
│   └── pricing/           # Pricing page
├── components/
│   ├── builder/           # Builder components
│   │   ├── ai-content-generator.tsx
│   │   ├── collaborator-presence.tsx
│   │   └── sortable-step.tsx
│   ├── nav/               # Navigation
│   └── ui/                # Shadcn components
├── lib/
│   ├── email.ts           # Email helpers
│   ├── realtime-collaboration.ts
│   ├── stripe.ts          # Stripe config
│   └── supabase.ts        # DB clients
├── emails/                # Email templates
└── data/                  # Static data
```

## 💡 Usage Examples

### Create a Funnel

1. Sign up at `/auth/register`
2. Go to Dashboard → Funnels
3. Click "Create New Funnel"
4. Add steps, drag to reorder
5. Edit content in right panel
6. Click "Save"

### Use AI Content Generator

1. Open funnel builder
2. Select a step
3. Click "Generate with AI"
4. Enter target audience and instructions
5. AI creates headline, body, CTA
6. Content auto-fills

### Invite Team Members

1. Go to Organizations
2. Create or select organization
3. Click "Invite Member"
4. Enter email and role
5. They receive invitation email
6. Click link to join

### Share Publicly

1. Open funnel builder
2. Toggle "Make Public"
3. Click "Copy Link"
4. Share URL with anyone
5. View at `/public/[funnelId]`

### Export as HTML

1. Open funnel builder
2. Click "Export HTML"
3. Download ZIP file
4. Contains all steps as HTML
5. Upload to any host

## 💰 Pricing Plans

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Funnels | 3 | 25 | Unlimited |
| Templates | ✓ | ✓ | ✓ |
| Analytics | ✓ | ✓ | ✓ |
| AI Content | Limited | ✓ | ✓ |
| Teams | - | 5 members | Unlimited |
| Export | - | ✓ | ✓ |
| Support | Community | Email | Priority |
| **Price** | **Free** | **$29/mo** | **$99/mo** |

## 🔧 Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Start production
npm start

# Lint code
npm run lint
```

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy

### Post-Deployment

1. Update Stripe webhook URL:
   ```
   https://yourdomain.com/api/billing/webhook
   ```

2. Update Resend sender domain

3. Set production environment variables

## 📚 Documentation

- **[SETUP.md](SETUP.md)** - Detailed setup guide
- **[FEATURES.md](FEATURES.md)** - Feature documentation
- **[Supabase Docs](https://supabase.com/docs)**
- **[Stripe Docs](https://stripe.com/docs)**
- **[OpenAI Docs](https://platform.openai.com/docs)**

## 🔒 Security Features

- Supabase Row Level Security (RLS)
- Environment variables protected
- CSRF protection
- Stripe webhook verification
- Input validation & sanitization
- Secure session management

## 🐛 Troubleshooting

**Supabase Connection Issues**
- Verify URL/key in `.env.local`
- Check RLS policies
- Ensure user authenticated

**Stripe Webhooks Not Working**
- Use Stripe CLI locally
- Verify webhook secret
- Check Stripe dashboard logs

**Realtime Not Syncing**
- Enable realtime in Supabase
- Check RLS read permissions
- Verify WebSocket connection

**AI Generation Failing**
- Verify OpenAI API key
- Check API quota
- Review rate limits

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open Pull Request

## 📝 License

MIT License - see LICENSE file

## 🙏 Acknowledgments

Built with amazing tools:
- [Next.js](https://nextjs.org)
- [Supabase](https://supabase.com)
- [Stripe](https://stripe.com)
- [Shadcn UI](https://ui.shadcn.com)
- [Resend](https://resend.com)
- [OpenAI](https://openai.com)

## 💬 Support

- 📖 Check [documentation](FEATURES.md)
- 🐛 [Open an issue](https://github.com/your-repo/issues)
- 💡 [Request a feature](https://github.com/your-repo/issues/new)

---

Made with ❤️ using Next.js, Supabase, Stripe, and AI
