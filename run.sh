#!/bin/bash
# One-command setup and launcher for the Hamiltonian Pendulum React web application.

# Exit on error
set -e

# Verify node and npm are installed
if ! command -v npm &> /dev/null; then
    echo "Error: Node.js and npm are required to run this application."
    echo "Please install Node.js (v18+) and try again."
    exit 1
fi

PROJECT_DIR="projects/pendulum-hamiltonian-lab"

echo "=============================================="
echo "Entering project directory..."
echo "=============================================="
cd "$PROJECT_DIR"

echo "=============================================="
echo "Verifying npm packages..."
echo "=============================================="
npm install

echo "=============================================="
echo "Launching web server..."
echo "=============================================="
# Run the Vite development server binding to host interfaces
npm run dev -- --host

