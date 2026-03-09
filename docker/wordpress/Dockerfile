FROM --platform=linux/amd64 wordpress:6-apache

ARG CACHE_BUST=4

# Fix server name
RUN echo 'ServerName localhost' >> /etc/apache2/apache2.conf

# Disable ALL MPM modules then re-enable only prefork to prevent conflicts
RUN set -ex; \
    a2dismod mpm_event || true; \
    a2dismod mpm_worker || true; \
    a2enmod mpm_prefork; \
    # Verify only one MPM is enabled
    ls /etc/apache2/mods-enabled/ | grep mpm

# Replace apache2-foreground to support Railway's $PORT env var
RUN printf '#!/bin/sh\nset -e\nPORT="${PORT:-80}"\nsed -i "s/^Listen .*/Listen ${PORT}/" /etc/apache2/ports.conf\nsed -i "s/<VirtualHost \\*:[0-9]*>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-enabled/000-default.conf\necho "Starting Apache on port ${PORT}"\nexec apache2 -D FOREGROUND\n' \
    > /usr/local/bin/apache2-foreground && \
    chmod +x /usr/local/bin/apache2-foreground

EXPOSE 80
