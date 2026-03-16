# Guide: Designing in Studio, Executing with CLI

## Overview

RealityDB Studio is the visual design tool. RealityDB CLI is the execution engine. This guide walks through the complete workflow of designing a schema in Studio and turning it into a production-scale database.

## Step 1: Open Studio

Visit [studio.realitydb.dev](https://studio.realitydb.dev) or run locally:

```bash
cd realityDB-sutudio
npm run dev
# Opens at http://localhost:3001
```

## Step 2: Design Your Schema

### Start from a Template
Click any domain template in the sidebar (SaaS, E-Commerce, FinTech, etc.) to start with a proven schema. You can modify it afterward.

### Start from Scratch
1. Click **+ NEW TABLE** to add a table
2. Each table auto-gets an `id` (UUID, PK) column
3. Click a table to select it, then use **Quick Fields** in the sidebar to add common columns (email, name, status, etc.)
4. Or click **+ ADD COLUMN** on the table card to add custom columns

### Smart Defaults
Studio auto-infers the right strategy based on column names:
- Column named `email` gets the email strategy
- Column named `created_at` gets the timestamp strategy
- Column named `status` gets the enum strategy with common defaults
- Column named `amount` or `price` gets the decimal strategy with min/max

### Configure Columns
Click a column in the Inspector panel to configure:
- **Data Type** — uuid, string, integer, decimal, boolean, timestamp, enum, etc.
- **Strategy** — the generation rule (how data is produced)
- **Options** — min/max for numbers, values/weights for enums
- **Primary Key / Nullable** — toggle as needed

### Draw Relationships
Click **Create Relationship** in the Inspector when a table is selected. Pick a target table and Studio will:
- Create a foreign key column on the target table
- Draw a visual relationship line on the canvas
- Set the semantic type (connection, trigger, lifecycle, etc.)

You can also drag from a PK handle on one table to another table on the canvas.

### Configure Lifecycle Rules
For enum columns (like `status`):
1. Select the column in the Inspector
2. Scroll to **Lifecycle Semantics**
3. For each enum value, choose which fields should be NULL when that value is active
4. Example: status = "cancelled" nullifies "shipped_at" and "delivered_at"

### Configure Temporal Dependencies
For timestamp columns:
1. Select the column in the Inspector
2. Scroll to **Temporal Logic**
3. Set **Depends On** to another timestamp column
4. Set **Rule** to "Must be AFTER" or "Must be BEFORE"
5. Example: `delivered_at` depends on `shipped_at` with rule "after"

### Configure Weighted Distributions
For enum columns:
1. Set the **Values** (comma-separated)
2. Set **Distribution Weights** for each value
3. Example: pending=20%, shipped=30%, delivered=40%, returned=10%

## Step 3: Validate

Click **Export** in the top right. The export modal shows:
- **Green checkmark** if the schema is valid
- **Warnings** for non-critical issues (missing timestamps, nullable FKs)
- **Errors** for blocking issues (missing PKs, orphan FKs) — must fix before exporting

## Step 4: Export

The export modal offers three formats:

### RealityDB Template (primary)
A CLI-compatible JSON file containing table definitions, strategies, FK references, lifecycle rules, temporal deps, and weights. This is what `realitydb run --pack` and `realitydb seed --template` consume.

### SQL DDL
PostgreSQL CREATE TABLE statements with proper types, PKs, FKs, NOT NULL constraints, and lifecycle-aware nullable columns. Apply directly to a database with `psql < schema.sql`.

### Studio Pack
Full internal format including table positions and UI state. Use this to re-import into Studio later for further editing.

## Step 5: Execute with CLI

### Option A: One Command (recommended)
```bash
realitydb run \
  --pack realitydb-template.json \
  --connection "postgresql://user:pass@localhost:5432/mydb" \
  --records 10000 \
  --seed 42
```

This creates the tables AND seeds the data. The output shows each table created and seeded.

### Option B: Two Steps (more control)
```bash
# Step 1: Apply DDL manually
psql -d mydb < schema.sql

# Step 2: Seed with template
realitydb seed \
  --template realitydb-template.json \
  --records 10000 \
  --seed 42
```

### Option C: Analyze + Seed (existing database)
If you already have tables and just want realistic data:
```bash
realitydb analyze --output my-template.json  # Auto-infer strategies
realitydb seed --template my-template.json --records 10000
```

## Step 6: Verify

```sql
-- Check row counts
SELECT tablename, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC;

-- Check FK integrity (should return 0)
SELECT COUNT(*) FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
WHERE c.id IS NULL;

-- Check enum distribution
SELECT status, COUNT(*), ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER() * 100, 1) as pct
FROM orders GROUP BY status ORDER BY count DESC;

-- Check temporal ordering (should return 0)
SELECT COUNT(*) FROM orders
WHERE shipped_at IS NOT NULL AND shipped_at < created_at;
```

## Iterating

The workflow is designed for iteration:
1. Run `realitydb run --pack` with `--dry-run` to preview
2. Check the DDL and plan
3. Adjust your schema in Studio
4. Re-export and re-run with `--drop-existing`

Each iteration takes seconds, not hours.

## Strategy Mapping Reference

Studio strategies map to CLI strategies as follows:

| Studio Strategy | CLI Strategy |
|----------------|-------------|
| uuid | uuid |
| name | full_name |
| company_name | company_name |
| email | email |
| phone | phone |
| random_string | text |
| integer | integer |
| decimal | float |
| boolean | boolean |
| timestamp | timestamp |
| past_date | timestamp |
| future_date | timestamp |
| auto_increment | auto_increment |
| enum | enum |

The export handles this mapping automatically. You don't need to think about it.
