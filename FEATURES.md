# Funnel Maker - Advanced Features

## 🚀 New Features

### 1. **Email Notifications (Resend)**
Automated email system for user engagement:
- Welcome emails on signup
- Funnel export notifications
- Team invitation emails

### 2. **Organizations & Teams**
Collaborate with your team:
- Create organizations
- Invite team members by email
- Role-based permissions (Owner, Admin, Member)
- Share funnels across teams

### 3. **AI Content Generator (OpenAI)**
AI-powered content creation:
- Generate funnel ideas based on audience and offer
- Auto-generate compelling copy for funnel steps
- Rewrite and optimize existing content

### 4. **Real-time Collaboration**
Work together in real-time:
- Live presence indicators
- See who's online
- Synchronized funnel editing
- Broadcast updates to all collaborators

### 5. **Public Funnel Sharing**
Share your funnels publicly:
- Toggle public/private visibility
- Generate shareable links
- Public view without authentication
- Preview mode for visitors

### 6. **HTML Export**
Download complete funnel as HTML:
- Export as ZIP file
- Includes all funnel steps
- Ready-to-deploy HTML files
- Upload to any hosting provider

---

## 📋 Setup Instructions

### Prerequisites
- Node.js 18+
- Supabase account
- Stripe account
- Resend account (for emails)
- OpenAI API key (for AI features)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.local.example` to `.env.local` and fill in all values:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# App
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

### 3. Update Database Schema

Run the updated `supabase-schema.sql` in your Supabase SQL Editor. This adds:
- `organizations` table
- `org_members` table
- `invitations` table
- `is_public` field to funnels
- Updated RLS policies

### 4. Set up Resend

1. Sign up at [resend.com](https://resend.com)
2. Get your API key
3. Verify your domain (or use test mode)
4. Update sender emails in `lib/email.ts` to use your verified domain

### 5. Set up OpenAI

1. Get API key from [platform.openai.com](https://platform.openai.com)
2. Add to `.env.local`
3. Monitor usage in OpenAI dashboard

### 6. Enable Supabase Realtime

1. In Supabase Dashboard, go to Database → Replication
2. Enable realtime for the `funnels` table
3. Ensure broadcast is enabled

---

## 🎯 Feature Guide

### Using AI Content Generator

1. Open funnel builder
2. Select a step
3. Click "Generate with AI"
4. Enter instructions (e.g., "make it more persuasive")
5. AI generates headline, body, and CTA
6. Content automatically populates your step

### Creating an Organization

1. Go to Dashboard → Organizations
2. Click "Create Organization"
3. Enter organization name
4. Invite team members via email
5. They receive an invitation link

### Inviting Team Members

1. Open an organization
2. Click "Invite Member"
3. Enter email and select role
4. Invitation email sent automatically
5. Member clicks link to join

### Making a Funnel Public

1. Open funnel builder
2. Click "Make Public" button
3. Click "Copy Link" to share
4. Anyone with link can view funnel
5. View at `/public/[funnelId]`

### Exporting as HTML

1. Open funnel builder
2. Click "Export HTML"
3. Downloads ZIP file with:
   - index.html (overview)
   - Individual step HTML files
   - README with instructions
4. Upload to any web host

### Real-time Collaboration

- Multiple team members can edit same funnel
- See online collaborators with colored badges
- Changes sync automatically
- No page refresh needed

---

## 🔧 API Routes

### Email
- `POST /api/emails/welcome` - Send welcome email

### Organizations
- `GET /api/organizations` - List user's organizations
- `POST /api/organizations` - Create organization
- `GET /api/organizations/[orgId]/members` - List members
- `POST /api/organizations/[orgId]/members` - Invite member
- `DELETE /api/organizations/[orgId]/members` - Remove member

### AI
- `POST /api/ai/idea` - Generate funnel idea
- `POST /api/ai/step` - Generate step content

### Public
- `GET /api/public/funnels/[funnelId]` - Get public funnel

### Export
- `GET /api/funnels/[funnelId]/export` - Export as HTML ZIP

### Invitations
- `GET /api/invite/[token]` - Accept invitation

---

## 🎨 New Components

- `AIContentGenerator` - AI copy generation modal
- `AIFunnelIdeaGenerator` - AI funnel idea modal
- `CollaboratorPresence` - Show online users
- `RealtimeCollaboration` - Real-time sync class

---

## 📊 Database Schema Updates

```sql
-- Organizations
CREATE TABLE organizations (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  owner_id uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Organization Members
CREATE TABLE org_members (
  id uuid PRIMARY KEY,
  org_id uuid REFERENCES organizations(id),
  user_id uuid REFERENCES users(id),
  role text CHECK (role IN ('owner', 'admin', 'member')),
  created_at timestamptz DEFAULT now()
);

-- Invitations
CREATE TABLE invitations (
  id uuid PRIMARY KEY,
  org_id uuid REFERENCES organizations(id),
  email text NOT NULL,
  role text,
  invited_by uuid REFERENCES users(id),
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Funnels Update
ALTER TABLE funnels ADD COLUMN is_public boolean DEFAULT false;
ALTER TABLE funnels ADD COLUMN org_id uuid REFERENCES organizations(id);
```

---

## 🚦 Testing

### Test Email Sending
```bash
# Trigger welcome email
# Sign up new user at /auth/register
```

### Test AI Generation
```bash
# Requires OpenAI API key
# Open builder → Click "Generate with AI"
```

### Test Real-time Collaboration
```bash
# Open same funnel in 2 browser tabs
# Edit in one tab
# See changes in other tab
```

### Test Public Sharing
```bash
# Make funnel public
# Open link in incognito window
# Should view without login
```

---

## 💰 Cost Considerations

- **Supabase**: Free tier includes realtime
- **Resend**: Free tier: 3,000 emails/month
- **OpenAI**: Pay per token (~$0.002 per request)
- **Stripe**: Free (fees on transactions only)

---

## 🔒 Security Notes

- RLS policies protect all data
- Invitations expire after 7 days
- Public funnels are read-only
- AI content is filtered by OpenAI
- Environment variables never exposed to client

---

## 🐛 Troubleshooting

### Realtime not working
- Check Supabase realtime is enabled
- Verify RLS policies allow reads
- Check browser console for errors

### AI generation failing
- Verify OpenAI API key is valid
- Check API quota/billing
- Review OpenAI dashboard logs

### Emails not sending
- Verify Resend API key
- Check sender domain is verified
- Review Resend dashboard logs

### Public links not working
- Ensure `is_public = true` in database
- Check RLS policy allows public reads
- Verify correct URL format

---

## 📚 Resources

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Resend Documentation](https://resend.com/docs)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)

---

## 🎉 What's Next?

Suggested improvements:
- Add commenting system for team collaboration
- Implement version history for funnels
- Add A/B testing capabilities
- Build analytics dashboard for public funnels
- Create mobile app
- Add integrations (Zapier, Make, etc.)

---

Built with ❤️ using Next.js, Supabase, Stripe, Resend, and OpenAI
