#!/bin/bash

# FitOS App - GitHub Setup Script
# Run this after creating the repo on GitHub

# Option 1: Create repo via GitHub CLI (if installed)
# gh repo create fitos-app --private --source=. --remote=origin --push

# Option 2: Manual setup
# 1. Go to https://github.com/new
# 2. Create a new private repo named "fitos-app"
# 3. Don't initialize with README (we have one)
# 4. Run these commands:

git remote add origin https://github.com/YOUR_USERNAME/fitos-app.git
git branch -M main
git push -u origin main

echo "Done! Your repo is now on GitHub."
