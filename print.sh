#!/bin/bash

# Enable debugging
set -x

# Folders to exclude from the search (relative to root_directory)
exclude_dirs=("node_modules" "archive" "gen" "json") # Add folder names here
echo "Excluding directories: ${exclude_dirs[*]}"

# Files to exclude from the root directory
exclude_files=("decodejwt.js") # Add file names here
echo "Excluding files: ${exclude_files[*]}"

# Print the directory tree
echo "Directory Tree:"
tree

# Create or clear the merged file
merged_file="merged_files.txt"
echo "Creating/clearing file: $merged_file"
> "$merged_file"

# Find JS files and append them to the merged file with breaks
echo "Starting to find and merge JS files..."
find . \( $(printf "! -path ./%s " "${exclude_dirs[@]}") -prune \) -o -type f -name "*.js" ! \( $(printf "! -name %s " "${exclude_files[@]}") \) -exec bash -c 'echo "Appending file: $0"; cat "$0" >> merged_files.txt; echo -e "\n#\n#\n#" >> merged_files.txt' {} \;

echo "All JS files have been merged into $merged_file, excluding specified directories and files."
