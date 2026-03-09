FROM --platform=linux/amd64 wordpress:6-apache

ARG CACHE_BUST=7

# Write a fresh /etc/apache2/mods-enabled by directly creating the symlinks
# First, print what's there for debugging
RUN echo "BEFORE:" && ls -la /etc/apache2/mods-enabled/ | grep mpm

# Nuclear option: remove all mpm module symlinks and only add prefork
RUN find /etc/apache2/mods-enabled/ -name 'mpm_*' -delete && \
    ln -sf /etc/apache2/mods-available/mpm_prefork.conf /etc/apache2/mods-enabled/mpm_prefork.conf && \
    ln -sf /etc/apache2/mods-available/mpm_prefork.load /etc/apache2/mods-enabled/mpm_prefork.load && \
    echo "AFTER:" && ls -la /etc/apache2/mods-enabled/ | grep mpm && \
    echo "Verifying apache config:" && \
    APACHE_RUN_DIR=/var/run/apache2 APACHE_RUN_USER=www-data APACHE_RUN_GROUP=www-data \
    APACHE_LOG_DIR=/var/log/apache2 APACHE_PID_FILE=/var/run/apache2/apache2.pid \
    apache2 -t 2>&1 | head -5 || true

# Patch apache2-foreground to remap Railway $PORT
RUN mv /usr/local/bin/apache2-foreground /usr/local/bin/apache2-foreground-orig && \
    printf '#!/bin/sh\nset -e\nPORT="${PORT:-80}"\nsed -i "s/^Listen .*/Listen ${PORT}/" /etc/apache2/ports.conf\nsed -i "s/<VirtualHost \\*:[0-9]*>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-enabled/000-default.conf\nexec /usr/local/bin/apache2-foreground-orig "$@"\n' \
    > /usr/local/bin/apache2-foreground && chmod +x /usr/local/bin/apache2-foreground

RUN echo 'ServerName localhost' >> /etc/apache2/apache2.conf

EXPOSE 80
