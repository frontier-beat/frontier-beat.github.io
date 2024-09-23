#!/bin/bash

find . ../frontier-beat -type f \
    -not -path "*/env/*" \
    -not -path "*/__pycache__/*" \
    -not -path "*/.idea/*" \
    -not -path "*/node_modules/*" \
    -not -path "*/logs/*" \
    -not -path "*/.git/*" \
    -not -path "*/build/*" \
    -not -path "*/static/*" \
    -not -name "*.png" \
    -not -name "package.json" \
    -not -name "package-lock.json" \
    -not -name "*.ico" \
    -not -name "*.pyc" \
    -not -name "*.so" \
    -not -name "*.dll" \
    -not -name "*.exe" \
    -not -name "*.bin" \
    -not -name "*.pdf" \
    -not -name "*.csv" \
    -not -name "*.map" \
    -not -name "*.sql" \
    -not -name "*.swp" \
    -not -name "*.pem" \
    -not -name "*.jpg" \
    -not -name "*.ipynb" \
    -not -name "*.gz" \
    -not -name ".DS_Store" \
    -not -name "project.txt" \
    -not -name "asset-manifest.json" \
    -not -name "manifest.json" \
    -not -name "robots.txt" \
    -not -name "service-worker.js" \
    -not -name "precache-manifest.*" \
    -print0 | while IFS= read -r -d '' file; do
        echo "======== FILE: $file ========"
        cat "$file"
        echo ""
    done
