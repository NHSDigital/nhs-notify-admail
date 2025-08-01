#!/bin/sh
# entrypoint.sh

# Create a config file that will be served by Nginx
echo "window.env = {" > /usr/share/nginx/html/env-config.js

# Read each environment variable starting with REACT_APP_
# and add it to the config file
printenv | grep "REACT_APP_" | while read -r line; do
  # Split the line into variable name and value
  VAR_NAME=$(echo "$line" | cut -d'=' -f1)
  VAR_VALUE=$(echo "$line" | cut -d'=' -f2)

  # Append to the JS file
  echo "  $VAR_NAME: \"$VAR_VALUE\"," >> /usr/share/nginx/html/env-config.js
done

echo "}" >> /usr/share/nginx/html/env-config.js

# Start Nginx in the foreground
exec nginx -g 'daemon off;'
