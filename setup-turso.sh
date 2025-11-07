#!/bin/bash
# Turso Database Setup Script
# Automates Turso database creation and schema migration for HakiVo

set -e

echo "🗄️  Turso Database Setup for HakiVo"
echo "===================================="
echo ""

# Check if Turso CLI is installed
if ! command -v turso &> /dev/null; then
    echo "📦 Installing Turso CLI..."
    curl -sSfL https://get.tur.so/install.sh | bash
    echo "✅ Turso CLI installed"
    echo ""

    # Add to PATH for this session
    export PATH="$HOME/.turso:$PATH"
fi

# Check if user is authenticated
echo "🔐 Checking Turso authentication..."
if ! turso auth whoami &> /dev/null; then
    echo "Please authenticate with Turso:"
    turso auth login
    echo "✅ Authenticated with Turso"
    echo ""
fi

# Create database
DB_NAME="hakivo-podcasts"
echo "📊 Creating Turso database: $DB_NAME"

if turso db list | grep -q "$DB_NAME"; then
    echo "⚠️  Database '$DB_NAME' already exists"
    read -p "Do you want to recreate it? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  Deleting existing database..."
        turso db destroy "$DB_NAME" --yes
        echo "✅ Database deleted"
    else
        echo "Using existing database"
    fi
fi

if ! turso db list | grep -q "$DB_NAME"; then
    echo "Creating new database..."
    turso db create "$DB_NAME"
    echo "✅ Database created: $DB_NAME"
fi

echo ""

# Get database URL and token
echo "🔗 Getting database credentials..."
DB_URL=$(turso db show "$DB_NAME" --url)
DB_TOKEN=$(turso db tokens create "$DB_NAME")

echo "✅ Database URL: $DB_URL"
echo "✅ Auth token generated"
echo ""

# Run migrations
echo "📝 Running database migrations..."
if [ -f "db/civic-db/0001_podcast_jobs_queue.sql" ]; then
    turso db shell "$DB_NAME" < db/civic-db/0001_podcast_jobs_queue.sql
    echo "✅ Schema created successfully"
else
    echo "⚠️  Migration file not found: db/civic-db/0001_podcast_jobs_queue.sql"
    echo "Please create the schema manually"
fi

echo ""

# Update .env.local
echo "🔧 Updating environment variables..."

if [ -f ".env.local" ]; then
    # Backup existing .env.local
    cp .env.local .env.local.backup
    echo "✅ Backed up .env.local to .env.local.backup"

    # Remove old Turso vars if they exist
    grep -v "TURSO_DATABASE_URL" .env.local.backup | grep -v "TURSO_AUTH_TOKEN" > .env.local.tmp || true

    # Add new Turso vars
    echo "" >> .env.local.tmp
    echo "# Turso Database (Production)" >> .env.local.tmp
    echo "TURSO_DATABASE_URL=\"$DB_URL\"" >> .env.local.tmp
    echo "TURSO_AUTH_TOKEN=\"$DB_TOKEN\"" >> .env.local.tmp

    mv .env.local.tmp .env.local
    echo "✅ Updated .env.local with Turso credentials"
else
    echo "# Turso Database (Production)" > .env.local
    echo "TURSO_DATABASE_URL=\"$DB_URL\"" >> .env.local
    echo "TURSO_AUTH_TOKEN=\"$DB_TOKEN\"" >> .env.local
    echo "✅ Created .env.local with Turso credentials"
fi

echo ""

# Set environment variables on Netlify
echo "🚀 Setting environment variables on Netlify..."
netlify env:set TURSO_DATABASE_URL "$DB_URL" || echo "   (already set or error)"
netlify env:set TURSO_AUTH_TOKEN "$DB_TOKEN" || echo "   (already set or error)"

echo "✅ Environment variables set on Netlify"
echo ""

# Test connection
echo "🧪 Testing database connection..."
TEST_RESULT=$(turso db shell "$DB_NAME" "SELECT COUNT(*) as count FROM podcast_jobs;" 2>/dev/null || echo "error")

if [ "$TEST_RESULT" != "error" ]; then
    echo "✅ Database connection test successful"
    echo "   Jobs in queue: $TEST_RESULT"
else
    echo "⚠️  Could not test database connection"
fi

echo ""
echo "===================================="
echo "✅ Turso Setup Complete!"
echo ""
echo "Next steps:"
echo "  1. Test locally: npm run dev"
echo "  2. Deploy to production: netlify deploy --prod"
echo ""
echo "Database Info:"
echo "  Name: $DB_NAME"
echo "  URL:  $DB_URL"
echo ""
echo "View your database:"
echo "  turso db shell $DB_NAME"
echo ""
