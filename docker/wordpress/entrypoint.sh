#!/bin/bash
set -e

# Railway injects $PORT — Apache needs to listen on that port
PORT="${PORT:-80}"

# Update Apache to listen on $PORT
sed -i "s/Listen 80/Listen $PORT/" /etc/apache2/ports.conf
sed -i "s/<VirtualHost \*:80>/<VirtualHost *:$PORT>/" /etc/apache2/sites-enabled/000-default.conf

# Call the official WordPress docker-entrypoint.sh
exec docker-entrypoint.sh "$@"
