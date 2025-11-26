# Backend Scripts

Database maintenance and utility scripts for the LINE Chat Summarizer backend.

## Database Scripts (`db/`)

All database scripts support `--dry-run` mode (default) and `--execute` mode.

### Check Duplicates
Analyzes database for duplicate data and integrity issues.

```bash
cd apps/backend
node scripts/db/check-duplicates.js
```

### Cleanup Database
Removes old closed sessions and messages to free up space.

```bash
# Dry run (see what would be deleted)
node scripts/db/cleanup-database.js --dry-run

# Delete data older than 7 days (default)
node scripts/db/cleanup-database.js --execute

# Delete data older than 30 days
node scripts/db/cleanup-database.js --execute --days=30
```

### Cleanup Messages (Aggressive)
Removes ALL messages from closed sessions.

```bash
# Dry run
node scripts/db/cleanup-messages-aggressive.js --dry-run

# Execute
node scripts/db/cleanup-messages-aggressive.js --execute
```

### Fix Duplicates
Fixes duplicate active sessions and removes orphaned messages.

```bash
# Dry run
node scripts/db/fix-duplicates.js --dry-run

# Execute
node scripts/db/fix-duplicates.js --execute
```

## Usage via npm

```bash
# From apps/backend directory
pnpm run db:check      # Check for duplicates
pnpm run db:cleanup    # Cleanup (dry-run)
pnpm run db:fix        # Fix duplicates (dry-run)
```

## Requirements

- `.env` file in `apps/backend/` with `MONGODB_URI` and `MONGODB_DB_NAME`
- Node.js 18+

## Safety

- Always run with `--dry-run` first to see what would be affected
- Scripts are idempotent and safe to run multiple times
- Backups recommended before running `--execute` on production data
