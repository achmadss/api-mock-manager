#!/bin/sh
set -e

# Go to parent directory of current working dir
cd ..

# Default value
DEFAULT_URL="http://localhost:3001"

# Path to .env file
ENV_FILE=".env"

# Check if .env exists
if [ -f "$ENV_FILE" ]; then
    VALUE=$(grep -E '^VITE_API_BASE_URL=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '[:space:]' | tr -d '"')
    if [ -n "$VALUE" ]; then
        export VITE_API_BASE_URL="$VALUE"
        echo "VITE_API_BASE_URL set from .env: $VITE_API_BASE_URL"
    else
        export VITE_API_BASE_URL="$DEFAULT_URL"
        echo "VITE_API_BASE_URL not found in .env, using default: $VITE_API_BASE_URL"
    fi
else
    export VITE_API_BASE_URL="$DEFAULT_URL"
    echo ".env file not found, using default: $VITE_API_BASE_URL"
fi

# Run the container's main command
exec "$@"
