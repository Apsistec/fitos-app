#!/bin/bash

# This script rewrites git history to remove exposed API keys

git filter-branch --force --index-filter \
  'git ls-files -s | \
   grep -q "docs/CLAUDE_MAX_MIGRATION_COMPLETE.md" && \
   git checkout-index -f -u docs/CLAUDE_MAX_MIGRATION_COMPLETE.md && \
   sed -i.bak "s/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/sk-YOUR-OPENAI-KEY-HERE/g" docs/CLAUDE_MAX_MIGRATION_COMPLETE.md && \
   sed -i.bak "s/355c6d9f596ed734905a105362d43a85ffda0e78/YOUR-DEEPGRAM-KEY-HERE/g" docs/CLAUDE_MAX_MIGRATION_COMPLETE.md && \
   sed -i.bak "s/re_g4J2GNa7_KVDNbkpNQ63mfywrovCUPdb9/YOUR-RESEND-KEY-HERE/g" docs/CLAUDE_MAX_MIGRATION_COMPLETE.md && \
   rm -f docs/CLAUDE_MAX_MIGRATION_COMPLETE.md.bak && \
   git add docs/CLAUDE_MAX_MIGRATION_COMPLETE.md || \
   true' \
  --tag-name-filter cat -- --all

echo "History rewritten! Now force push with: git push --force-with-lease"
