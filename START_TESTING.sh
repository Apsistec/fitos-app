#!/bin/bash

echo "🚀 Starting FitOS Local Testing Environment"
echo ""

# Check if Supabase is running
echo "📊 Checking Supabase status..."
if npx supabase status > /dev/null 2>&1; then
    echo "✅ Local Supabase is running!"
    echo ""
    echo "🔧 Development Tools:"
    echo "   Studio:  http://127.0.0.1:54323"
    echo "   Mailpit: http://127.0.0.1:54324"
    echo ""
else
    echo "❌ Local Supabase is not running. Starting it now..."
    npm run db:start
    echo ""
fi

echo "🌐 Starting development server..."
echo "   App URL: http://localhost:4200"
echo ""
echo "📧 Email verification links will appear in Mailpit:"
echo "   http://127.0.0.1:54324"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the app
npm start
