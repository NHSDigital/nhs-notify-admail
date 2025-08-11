#!/bin/sh
# entrypoint.sh

# Creates a config file that will be served by Nginx, this has the environment variables
# that are prefixed with REACT_APP_ so that the React app can access them at runtime.

echo "window.env = {" > /usr/share/nginx/html/env-config.js

printenv | grep "REACT_APP_" | while read -r line; do
  VAR_NAME=$(echo "$line" | cut -d'=' -f1)
  VAR_VALUE=$(echo "$line" | cut -d'=' -f2)
  echo "  $VAR_NAME: \"$VAR_VALUE\"," >> /usr/share/nginx/html/env-config.js
done

echo "}" >> /usr/share/nginx/html/env-config.js

# Start Nginx keeps the container running
exec nginx -g 'daemon off;'
