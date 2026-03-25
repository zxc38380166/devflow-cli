#!/bin/bash
# devflow-cli installer
# Usage: curl -fsSL https://raw.githubusercontent.com/zxc38380166/devflow-cli/main/install.sh | bash

set -e

INSTALL_DIR="$HOME/.devflow-cli"
REPO="https://github.com/zxc38380166/devflow-cli.git"

echo "Installing devflow-cli..."

if [ -d "$INSTALL_DIR" ]; then
  echo "Updating existing installation..."
  cd "$INSTALL_DIR"
  git pull origin main
else
  echo "Cloning devflow-cli..."
  git clone "$REPO" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

echo "Installing dependencies..."
yarn install

echo "Linking globally..."
yarn link

echo ""
echo "✔ devflow-cli installed successfully!"
echo "  Run 'devflow --help' to get started."
