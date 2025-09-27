#!/bin/bash

# Setup script for main-agent-service

echo "Setting up main-agent-service..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
fi

# Build the project
echo "Building the project..."
npm run build

echo "Setup complete! You can now run:"
echo "  npm run dev    # Start in development mode"
echo "  npm start      # Start in production mode"
echo "  npm test       # Run tests"
