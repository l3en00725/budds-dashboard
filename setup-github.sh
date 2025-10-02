#!/bin/bash

# Budd's Dashboard - GitHub Setup Script
echo "🚀 Setting up budds-dashboard for GitHub..."

# Check if git is available
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Xcode Command Line Tools first:"
    echo "   xcode-select --install"
    exit 1
fi

# Initialize git repository
echo "📁 Initializing git repository..."
git init

# Add all files
echo "📝 Adding files to git..."
git add .

# Create initial commit
echo "💾 Creating initial commit..."
git commit -m "🚀 Initial commit: Budd's Dashboard

Executive dashboard for Budd's Plumbing & HVAC with:
- Month-over-month financial trends (+17% invoiced, +29% collected)
- Real-time dashboard metrics (5-minute refresh)
- Jobber API integration with OAuth authentication
- OpenPhone call analytics integration
- Executive KPI widgets with AR aging
- Centralized sync configuration
- Realistic test data (258 invoices, 345 payments)

🤖 Generated with Claude Code https://claude.com/claude-code

Co-Authored-By: Claude <noreply@anthropic.com>"

echo "✅ Git repository initialized successfully!"
echo ""
echo "🔗 Next steps:"
echo "1. Create a new repository on GitHub:"
echo "   - Go to https://github.com/new"
echo "   - Repository name: budds-dashboard"
echo "   - Description: Executive dashboard for Budd's Plumbing & HVAC - Jobber CRM & OpenPhone integration"
echo "   - Set to Private (recommended for business data)"
echo ""
echo "2. Push to GitHub:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/budds-dashboard.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "🎉 Your Budd's Dashboard will be ready on GitHub!"