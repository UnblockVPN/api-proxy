#!/bin/bash
# Build api server
# Author: David Awatere
# build.sh

# Set your desired hostname here
HOSTNAME="api.unblockvpn.io"

# Check if certificate files exist in the specified directory
CERT_DIR="/etc/letsencrypt/live/${HOSTNAME}"
FULLCHAIN_CERT="${CERT_DIR}/fullchain.pem"
PRIVKEY_CERT="${CERT_DIR}/privkey.pem"

if [ ! -f "$FULLCHAIN_CERT" ] || [ ! -f "$PRIVKEY_CERT" ]; then
  echo "Error: Certificate files not found in $CERT_DIR"
  echo "Please manually copy the certificate files to this directory before running the script."
  exit 1
fi

# Install required packages
sudo apt-get update
sudo apt-get install -y nodejs npm git

# Clone the repository
git clone https://github.com/hinetapora/api-proxy $HOME/api-proxy

# Install Node.js dependencies
cd $HOME/api-proxy
npm install

# Install PM2 to manage the Node.js app and set it to start at boot
sudo npm install -g pm2
pm2 start proxy.js --watch
pm2 save
pm2 startup

# Install Nginx
sudo apt-get install -y nginx

# Remove the default Nginx configuration
sudo rm /etc/nginx/sites-enabled/default

# Create a new Nginx server block configuration
sudo tee /etc/nginx/sites-available/${HOSTNAME} > /dev/null <<EOL
server {
    listen 80;
    server_name ${HOSTNAME};

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOL

# Create a symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/${HOSTNAME} /etc/nginx/sites-enabled/

# Test Nginx configuration and reload it
sudo nginx -t
sudo systemctl reload nginx

# Check if the app is running
curl http://${HOSTNAME}:443

# Check the certificate
openssl s_client -connect ${HOSTNAME}:443
