#!/bin/bash
# AWS Setup Commands for macOS

echo "Installing AWS CLI..."
brew install awscli

echo "Installing EB CLI..."
pip3 install awsebcli --upgrade --user

echo "Adding EB CLI to PATH..."
echo 'export PATH=$PATH:$HOME/.local/bin' >> ~/.zshrc
source ~/.zshrc

echo "Installation complete! Now run: aws configure"