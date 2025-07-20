#!/bin/bash

# Fix all JSONB default syntax errors by removing the PostgreSQL casting syntax
# This converts from: .default("'[]'::jsonb") to .default('[]')

sed -i 's/\.default("'"'"'\[\]'"'"'::jsonb")/.default('"'"'[]'"'"')/g' shared/schema.ts
sed -i 's/\.default("'"'"'{}'"'"'::jsonb")/.default('"'"'{}'"'"')/g' shared/schema.ts

# Also fix any other timestamp or text defaults with PostgreSQL casting
sed -i 's/\.default("'"'"'now()'"'"'")/.default(sql`now()`)/g' shared/schema.ts
sed -i 's/\.default("'"'"'pending'"'"'::text")/.default("pending")/g' shared/schema.ts
sed -i 's/\.default("'"'"'active'"'"'::text")/.default("active")/g' shared/schema.ts
sed -i 's/\.default("'"'"'scheduled'"'"'::text")/.default("scheduled")/g' shared/schema.ts
sed -i 's/\.default("'"'"'routine'"'"'::text")/.default("routine")/g' shared/schema.ts
sed -i 's/\.default("'"'"'manual_entry'"'"'::text")/.default("manual_entry")/g' shared/schema.ts
sed -i 's/\.default("'"'"'unconfirmed'"'"'::text")/.default("unconfirmed")/g' shared/schema.ts

echo "Fixed JSONB and other default value syntax errors"