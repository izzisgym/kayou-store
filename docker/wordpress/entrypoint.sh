#!/bin/bash
set -e

# Railway sets $PORT — remap Apache to listen on it
APP_PORT="${PORT:-80}"

if [ "$APP_PORT" != "80" ]; then
    sed -i "s/Listen 80/Listen ${APP_PORT}/" /etc/apache2/ports.conf
    sed -i "s/<VirtualHost \*:80>/<VirtualHost *:${APP_PORT}>/" /etc/apache2/sites-enabled/000-default.conf
fi

exec docker-entrypoint.sh apache2-foreground
