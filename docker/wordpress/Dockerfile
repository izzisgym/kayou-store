FROM --platform=linux/amd64 wordpress:6-apache

ARG CACHE_BUST=5

# Fix server name
RUN echo 'ServerName localhost' >> /etc/apache2/apache2.conf

# Disable ALL MPM modules then re-enable only prefork to prevent conflicts
RUN set -ex; \
    a2dismod mpm_event || true; \
    a2dismod mpm_worker || true; \
    a2enmod mpm_prefork; \
    ls /etc/apache2/mods-enabled/ | grep mpm

# Wrap apache2-foreground: remap $PORT, then call the original wrapper
RUN mv /usr/local/bin/apache2-foreground /usr/local/bin/apache2-foreground-orig && \
    printf '#!/bin/sh\nset -e\nPORT="${PORT:-80}"\nsed -i "s/^Listen .*/Listen ${PORT}/" /etc/apache2/ports.conf\nsed -i "s/<VirtualHost \\*:[0-9]*>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-enabled/000-default.conf\nexec /usr/local/bin/apache2-foreground-orig "$@"\n' \
    > /usr/local/bin/apache2-foreground && \
    chmod +x /usr/local/bin/apache2-foreground

EXPOSE 80
