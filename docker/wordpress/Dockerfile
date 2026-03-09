FROM wordpress:6-apache

RUN echo 'ServerName localhost' >> /etc/apache2/apache2.conf

# Railway PORT remapping — run before handing off to the official WordPress entrypoint
RUN printf '#!/bin/bash\nset -e\nAPP_PORT="${PORT:-80}"\nif [ "$APP_PORT" != "80" ]; then\n  sed -i "s/Listen 80/Listen ${APP_PORT}/" /etc/apache2/ports.conf\n  sed -i "s/<VirtualHost \\*:80>/<VirtualHost *:${APP_PORT}>/" /etc/apache2/sites-enabled/000-default.conf\nfi\nexec /usr/local/bin/docker-entrypoint.sh apache2-foreground\n' > /railway-entrypoint.sh \
  && chmod +x /railway-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/railway-entrypoint.sh"]
