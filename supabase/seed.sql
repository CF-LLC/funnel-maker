-- Supabase Seed Data for Funnel Maker
-- This file creates demo data for testing and development

-- Note: You must create the demo user first through Supabase Auth
-- Then replace {{DEMO_USER_ID}} with the actual user ID

-- ====================================================
-- STEP 1: Create Demo User (Run in Supabase Auth Dashboard)
-- ====================================================
-- Email: demo@funnelmaker.com
-- Password: password123
-- After creating, copy the user ID and replace {{DEMO_USER_ID}} below

-- ====================================================
-- STEP 2: Insert User Record
-- ====================================================
INSERT INTO users (id, email)
VALUES ('{{DEMO_USER_ID}}', 'demo@funnelmaker.com')
ON CONFLICT (id) DO NOTHING;

-- ====================================================
-- STEP 3: Insert Demo Funnels
-- ====================================================

-- Lead Magnet Funnel
INSERT INTO funnels (id, user_id, name, steps, created_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '{{DEMO_USER_ID}}',
  'Lead Magnet Funnel',
  '[
    {
      "id": "step-1",
      "type": "landing",
      "title": "Free eBook: 10 Marketing Secrets",
      "content": "Discover the proven strategies that top marketers use to grow their business. Download your free copy now!",
      "order": 0
    },
    {
      "id": "step-2",
      "type": "lead-capture",
      "title": "Get Your Free eBook",
      "content": "Enter your email below and we will send you the eBook instantly.",
      "order": 1
    },
    {
      "id": "step-3",
      "type": "thank-you",
      "title": "Check Your Email!",
      "content": "Your free eBook has been sent to your inbox. Check your email now!",
      "order": 2
    }
  ]'::jsonb,
  NOW() - INTERVAL '10 days'
)
ON CONFLICT (id) DO NOTHING;

-- Product Sales Funnel
INSERT INTO funnels (id, user_id, name, steps, created_at)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '{{DEMO_USER_ID}}',
  'Product Sales Funnel',
  '[
    {
      "id": "step-1",
      "type": "landing",
      "title": "Transform Your Business Today",
      "content": "Our premium course will teach you everything you need to know to scale your business to 7 figures.",
      "order": 0
    },
    {
      "id": "step-2",
      "type": "sales",
      "title": "Special Offer: $497 $297",
      "content": "Limited time offer! Get instant access to the complete course, bonus materials, and lifetime updates.",
      "order": 1
    },
    {
      "id": "step-3",
      "type": "thank-you",
      "title": "Welcome to the Program!",
      "content": "Your purchase was successful. Access your course materials in your dashboard.",
      "order": 2
    }
  ]'::jsonb,
  NOW() - INTERVAL '5 days'
)
ON CONFLICT (id) DO NOTHING;

-- Webinar Funnel
INSERT INTO funnels (id, user_id, name, steps, created_at)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '{{DEMO_USER_ID}}',
  'Webinar Funnel',
  '[
    {
      "id": "step-1",
      "type": "landing",
      "title": "Free Live Training: Scale to $10K/Month",
      "content": "Join our exclusive webinar and learn the exact blueprint we used to build a 6-figure business.",
      "order": 0
    },
    {
      "id": "step-2",
      "type": "lead-capture",
      "title": "Register for the Free Webinar",
      "content": "Seats are limited! Reserve your spot now.",
      "order": 1
    },
    {
      "id": "step-3",
      "type": "sales",
      "title": "Special Webinar Offer",
      "content": "Get the complete system for only $997. This offer expires in 24 hours!",
      "order": 2
    },
    {
      "id": "step-4",
      "type": "thank-you",
      "title": "You are Registered!",
      "content": "Check your email for the webinar link. See you on the training!",
      "order": 3
    }
  ]'::jsonb,
  NOW() - INTERVAL '2 days'
)
ON CONFLICT (id) DO NOTHING;

-- ====================================================
-- STEP 4: Insert Analytics Data
-- ====================================================

-- Analytics for Lead Magnet Funnel
INSERT INTO analytics (funnel_id, data, created_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '{
    "visitors": 1200,
    "leads": 350,
    "conversions": 350,
    "conversionRate": 29.17,
    "dailyStats": [
      {"date": "2025-11-07", "visitors": 150, "leads": 45},
      {"date": "2025-11-08", "visitors": 180, "leads": 52},
      {"date": "2025-11-09", "visitors": 165, "leads": 48},
      {"date": "2025-11-10", "visitors": 190, "leads": 55},
      {"date": "2025-11-11", "visitors": 175, "leads": 50},
      {"date": "2025-11-12", "visitors": 160, "leads": 47},
      {"date": "2025-11-13", "visitors": 180, "leads": 53}
    ]
  }'::jsonb,
  NOW()
)
ON CONFLICT DO NOTHING;

-- Analytics for Product Sales Funnel
INSERT INTO analytics (funnel_id, data, created_at)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '{
    "visitors": 800,
    "leads": 150,
    "conversions": 20,
    "conversionRate": 13.33,
    "revenue": 5940,
    "dailyStats": [
      {"date": "2025-11-12", "visitors": 120, "leads": 22, "sales": 3},
      {"date": "2025-11-13", "visitors": 135, "leads": 25, "sales": 4},
      {"date": "2025-11-14", "visitors": 110, "leads": 20, "sales": 2},
      {"date": "2025-11-15", "visitors": 125, "leads": 23, "sales": 3},
      {"date": "2025-11-16", "visitors": 140, "leads": 27, "sales": 4},
      {"date": "2025-11-17", "visitors": 170, "leads": 33, "sales": 4}
    ]
  }'::jsonb,
  NOW()
)
ON CONFLICT DO NOTHING;

-- Analytics for Webinar Funnel
INSERT INTO analytics (funnel_id, data, created_at)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '{
    "visitors": 300,
    "leads": 50,
    "conversions": 10,
    "conversionRate": 20.0,
    "revenue": 9970,
    "dailyStats": [
      {"date": "2025-11-15", "visitors": 80, "leads": 12, "sales": 2},
      {"date": "2025-11-16", "visitors": 95, "leads": 16, "sales": 3},
      {"date": "2025-11-17", "visitors": 125, "leads": 22, "sales": 5}
    ]
  }'::jsonb,
  NOW()
)
ON CONFLICT DO NOTHING;

-- ====================================================
-- VERIFICATION QUERIES
-- ====================================================

-- Check inserted data
-- SELECT * FROM users WHERE email = 'demo@funnelmaker.com';
-- SELECT id, name, created_at FROM funnels WHERE user_id = '{{DEMO_USER_ID}}';
-- SELECT funnel_id, data->>'visitors' as visitors FROM analytics;
