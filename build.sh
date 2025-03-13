#!/bin/bash

# Clean dist directory
rm -rf dist/*

# Create directory structure
mkdir -p dist/js dist/css dist/assets

# Copy files
cp src/index.html dist/
cp src/manifest.json dist/
cp src/service-worker.js dist/
cp src/vocab.json dist/
cp src/js/app.js dist/js/
cp src/css/styles.css dist/css/
cp src/assets/icon.svg dist/assets/

echo "Build complete. Files copied to dist/" 