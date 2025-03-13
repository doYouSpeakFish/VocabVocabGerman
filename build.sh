#!/bin/bash

# Clean dist directory
rm -rf dist/*

# Create directory structure
mkdir -p dist/js dist/css dist/assets

# Copy files
cp -a src/. dist/

echo "Build complete. Files copied to dist/" 