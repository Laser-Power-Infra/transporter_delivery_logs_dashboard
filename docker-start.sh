#!/bin/sh
echo "--------------------------------------------------------"
echo "Initializing Transporter & Delivery Dashboard Database..."
echo "--------------------------------------------------------"

# Push schema to PostgreSQL DB
npx prisma db push --accept-data-loss || echo "Prisma db push completed with warnings."

# Seed initial users (Admin & Operator)
npx prisma db seed || echo "Prisma seed completed with warnings."

echo "--------------------------------------------------------"
echo "Starting Next.js Widescreen Dashboard Server on 0.0.0.0:3000..."
echo "--------------------------------------------------------"

exec node server.js
