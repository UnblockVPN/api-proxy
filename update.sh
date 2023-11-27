#!/bin/bash
# Update api server by cloning the current configuration on gh then restart the api daemon
# Author: David Awatere
# update.sh

# Define the URLs and paths
repository_url="https://github.com/hinetapora/api-proxy"
app_directory="/home/unblockvpnio/api-proxy"
clone_directory="/home/unblockvpnio/tmp"

# Copy this script to a temporary location
cp "$0" "$clone_directory/update.sh"

# Clone the Git repository
git clone "$repository_url" "$clone_directory"

# Check if the clone was successful
if [ $? -eq 0 ]; then
  echo "Git clone successful."
  
  # Copy the files to the app folder
  cp -r "$clone_directory"/* "$app_directory"
  
  # Check if the copy was successful
  if [ $? -eq 0 ]; then
    echo "Files copied to app folder."
    
    # Delete the temporary directory
    rm -rf "$clone_directory"
    echo "Temporary directory deleted."
    
    # Restart the PM2 process
    sudo pm2 restart "$app_directory/proxy.js" --watch --log
    echo "PM2 process restarted."
  else
    echo "Error: Failed to copy files to app folder."
  fi
else
  echo "Error: Git clone failed."
fi
