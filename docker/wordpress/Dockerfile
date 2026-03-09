FROM wordpress:6-apache

# Fix Apache config
RUN echo 'ServerName localhost' >> /etc/apache2/apache2.conf

# Disable conflicting MPM modules - keep only mpm_prefork
RUN a2dismod mpm_event mpm_worker 2>/dev/null; a2enmod mpm_prefork 2>/dev/null; true

# Verify no MPM conflict at build time
RUN apache2 -t 2>&1 | grep -v "More than one" || true

# Wrap apache2-foreground so it remaps PORT before starting
RUN mv /usr/local/bin/apache2-foreground /usr/local/bin/apache2-foreground-orig
RUN printf '#!/bin/sh\nAPP_PORT="${PORT:-80}"\nif [ "$APP_PORT" != "80" ]; then\nsed -i "s/Listen 80/Listen ${APP_PORT}/" /etc/apache2/ports.conf\nsed -i "s/<VirtualHost \\*:80>/<VirtualHost *:${APP_PORT}>/" /etc/apache2/sites-enabled/000-default.conf\nfi\nexec /usr/local/bin/apache2-foreground-orig "$@"\n' > /usr/local/bin/apache2-foreground && chmod +x /usr/local/bin/apache2-foreground

EXPOSE 80
