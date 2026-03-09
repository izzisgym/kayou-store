FROM wordpress:6-apache

RUN echo 'ServerName localhost' >> /etc/apache2/apache2.conf && \
    # Fix MPM conflict
    a2dismod mpm_event mpm_worker 2>/dev/null || true && \
    a2enmod mpm_prefork 2>/dev/null || true

# Railway injects $PORT - override the apache2-foreground script to respect it  
RUN mv /usr/local/bin/apache2-foreground /usr/local/bin/apache2-foreground-orig && \
    printf '#!/bin/sh\n\
APP_PORT="${PORT:-80}"\n\
if [ "$APP_PORT" != "80" ]; then\n\
  sed -i "s/Listen 80/Listen ${APP_PORT}/" /etc/apache2/ports.conf\n\
  sed -i "s/<VirtualHost \\*:80>/<VirtualHost *:${APP_PORT}>/" /etc/apache2/sites-enabled/000-default.conf\n\
fi\n\
exec /usr/local/bin/apache2-foreground-orig "$@"\n' \
    > /usr/local/bin/apache2-foreground && \
    chmod +x /usr/local/bin/apache2-foreground

EXPOSE 80
