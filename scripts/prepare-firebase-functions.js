#!/usr/bin/env node
/**
 * Prepare Firebase Cloud Functions for deployment
 * Creates package.json in server directory for runtime detection
 */

const fs = require('fs');
const path = require('path');

const serverDir = path.join(__dirname, '../dist/apps/landing/server');
const packageJsonPath = path.join(serverDir, 'package.json');

// Check if server directory exists
if (!fs.existsSync(serverDir)) {
  console.error('❌ Error: Server directory not found at', serverDir);
  console.error('   Run "npm run build:landing" first');
  process.exit(1);
}

// Create package.json for Cloud Functions
const packageJson = {
  "name": "fitos-landing-ssr",
  "version": "0.1.0",
  "description": "FitOS Landing Page SSR Functions",
  "type": "module",
  "main": "server.mjs",
  "engines": {
    "node": "22"
  },
  "dependencies": {
    "@angular/animations": "^21.1.1",
    "@angular/common": "^21.1.1",
    "@angular/core": "^21.1.1",
    "@angular/platform-browser": "^21.1.1",
    "@angular/platform-server": "^21.1.1",
    "@angular/router": "^21.1.1",
    "@angular/ssr": "^21.1.1"
  }
};

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

console.log('✅ Created package.json for Firebase Functions');
console.log('📄', packageJsonPath);
