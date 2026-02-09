#!/usr/bin/env node
/**
 * Prepare Firebase Cloud Functions for deployment
 *
 * The Angular SSR build outputs an Express app in dist/apps/landing/server/server.mjs
 * that calls listen() directly. Firebase Functions needs:
 *   1. A package.json with "type": "module" and firebase-functions dependency
 *   2. An index.js entry point that wraps the Express app as a Cloud Function
 *      (without calling listen() — Firebase manages the HTTP server)
 *
 * This script generates both files after the Angular build.
 */

const fs = require('fs');
const path = require('path');

const serverDir = path.join(__dirname, '../dist/apps/landing/server');

// Check if server directory exists
if (!fs.existsSync(serverDir)) {
  console.error('Error: Server directory not found at', serverDir);
  console.error('   Run "npm run build:landing" first');
  process.exit(1);
}

// 1. Create package.json for Cloud Functions runtime detection
const packageJson = {
  "name": "fitos-landing-ssr",
  "version": "0.1.0",
  "description": "FitOS Landing Page SSR Cloud Function",
  "type": "module",
  "main": "index.js",
  "engines": {
    "node": "22"
  },
  "dependencies": {
    "firebase-functions": "^6.3.0",
    "firebase-admin": "^13.0.0"
  }
};

fs.writeFileSync(
  path.join(serverDir, 'package.json'),
  JSON.stringify(packageJson, null, 2) + '\n'
);
console.log('Created package.json for Firebase Functions');

// 2. Create index.js entry point wrapping Express app as Cloud Function
const indexJs = `import { onRequest } from 'firebase-functions/v2/https';
import { app } from './server.mjs';

// Export the Angular SSR Express app as a Firebase Cloud Function
export const ssrApp = onRequest(app());
`;

fs.writeFileSync(path.join(serverDir, 'index.js'), indexJs);
console.log('Created index.js Cloud Function entry point');
