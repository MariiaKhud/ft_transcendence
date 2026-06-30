#!/bin/sh
set -e

max_attempts=10
attempt=1

while [ "$attempt" -le "$max_attempts" ]; do
  echo "Applying Prisma migrations (attempt ${attempt}/${max_attempts})..."

  if npx prisma migrate deploy; then
    echo "Prisma migrations applied successfully."
    break
  fi

  if [ "$attempt" -eq "$max_attempts" ]; then
    echo "Prisma migrations failed after ${max_attempts} attempts."
    exit 1
  fi

  attempt=$((attempt + 1))
  echo "Migration failed, retrying in 3s..."
  sleep 3
done

echo "Generating Prisma client..."
npx prisma generate

if [ ! -e "/app/node_modules/@prisma/client/.prisma" ]; then
  mkdir -p /app/node_modules/@prisma/client
  ln -s /app/node_modules/.prisma /app/node_modules/@prisma/client/.prisma
fi

if [ "$NODE_ENV" = "development" ]; then
  exec npm run dev
fi

exec npm run start
