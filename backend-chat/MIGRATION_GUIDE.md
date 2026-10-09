# Chat Database Migration Guide

## Changes Made
1. Added `seenAt` (DateTime?) to `ChatMessage` - tracks when message was seen by recipient
2. Added `lastActiveAt` (DateTime) to `ChatParticipant` - tracks user activity for "Active now" status

## Migration Steps

### Option 1: Fresh Database (Development)
```bash
# Delete existing database and recreate
rm prisma/dev.db
npx prisma generate
npx prisma db push
```

### Option 2: Manual Migration (Production)
```bash
# Generate Prisma client with new schema
npx prisma generate

# Push schema changes to database
npx prisma db push
```

### SQL Migration (if needed manually)
```sql
-- Add seenAt to ChatMessage
ALTER TABLE chatMessage ADD COLUMN seenAt DATETIME;

-- Add lastActiveAt to ChatParticipant
ALTER TABLE chatParticipant ADD COLUMN lastActiveAt DATETIME DEFAULT CURRENT_TIMESTAMP;
```

## Verify Migration
```bash
npx prisma studio
# Check that both tables have the new columns
```

## Deploy Steps
1. Run migration on backend-chat database
2. Deploy backend-chat with new controllers
3. Deploy frontend with new UI
4. Test seen receipts and activity status

