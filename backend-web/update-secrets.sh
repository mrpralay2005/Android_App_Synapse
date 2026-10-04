#!/bin/bash
# Update DATABASE_URL secret for production backend
echo "Updating backend-web production DATABASE_URL..."
echo 'postgresql://postgres.vcwhkuhyqlhlcsgleswl:Database%40password%402026@aws-0-ap-south-1.pooler.supabase.com:5432/postgres' | npx wrangler secret put DATABASE_URL --env=""

echo "Updating backend-web staging DATABASE_URL..."
echo 'postgresql://postgres.vcwhkuhyqlhlcsgleswl:Database%40password%402026@aws-0-ap-south-1.pooler.supabase.com:5432/postgres' | npx wrangler secret put DATABASE_URL --env=staging
