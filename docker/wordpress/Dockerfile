FROM --platform=linux/amd64 wordpress:6-apache

ARG CACHE_BUST=6

RUN echo 'ServerName localhost' >> /etc/apache2/apache2.conf

# Show current MPM state for debugging
RUN echo "=== MPM mods-enabled ===" && ls /etc/apache2/mods-enabled/ | grep mpm || echo "none"
RUN echo "=== MPM mods-available ===" && ls /etc/apache2/mods-available/ | grep mpm || echo "none"

# Explicitly remove ALL mpm symlinks and only create mpm_prefork
RUN rm -f /etc/apache2/mods-enabled/mpm_*.conf \
          /etc/apache2/mods-enabled/mpm_*.load && \
    ln -s /etc/apache2/mods-available/mpm_prefork.conf /etc/apache2/mods-enabled/mpm_prefork.conf && \
    ln -s /etc/apache2/mods-available/mpm_prefork.load /etc/apache2/mods-enabled/mpm_prefork.load && \
    echo "=== After fix ===" && ls /etc/apache2/mods-enabled/ | grep mpm

# Wrap apache2-foreground to remap Railway $PORT
RUN mv /usr/local/bin/apache2-foreground /usr/local/bin/apache2-foreground-orig && \
    printf '#!/bin/sh\nset -e\nPORT="${PORT:-80}"\nsed -i "s/^Listen .*/Listen ${PORT}/" /etc/apache2/ports.conf\nsed -i "s/<VirtualHost \\*:[0-9]*>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-enabled/000-default.conf\nexec /usr/local/bin/apache2-foreground-orig "$@"\n' \
    > /usr/local/bin/apache2-foreground && \
    chmod +x /usr/local/bin/apache2-foreground

EXPOSE 80
