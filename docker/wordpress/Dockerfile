FROM --platform=linux/amd64 wordpress:6-apache

ARG CACHE_BUST=9

RUN echo 'ServerName localhost' >> /etc/apache2/apache2.conf

# Replace apache2-foreground with a runtime wrapper that:
# 1. Removes Railway-injected mpm_event symlinks at runtime
# 2. Remaps PORT
# 3. Then calls the real apache2-foreground
RUN mv /usr/local/bin/apache2-foreground /usr/local/bin/apache2-foreground-orig && \
    printf '#!/bin/sh\nset -e\n\
# Railway injects mpm_event at runtime — remove it\n\
rm -f /etc/apache2/mods-enabled/mpm_event.conf\n\
rm -f /etc/apache2/mods-enabled/mpm_event.load\n\
rm -f /etc/apache2/mods-enabled/mpm_worker.conf\n\
rm -f /etc/apache2/mods-enabled/mpm_worker.load\n\
# Remap Railway PORT (Railway injects $PORT, default 80)\n\
PORT="${PORT:-80}"\n\
sed -i "s/^Listen .*/Listen ${PORT}/" /etc/apache2/ports.conf\n\
sed -i "s/<VirtualHost \\*:[0-9]*>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-enabled/000-default.conf\n\
exec /usr/local/bin/apache2-foreground-orig "$@"\n' \
    > /usr/local/bin/apache2-foreground && chmod +x /usr/local/bin/apache2-foreground

EXPOSE 80
