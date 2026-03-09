FROM wordpress:latest

# Apache listens on $PORT (Railway injects this), default 80
RUN echo 'ServerName localhost' >> /etc/apache2/apache2.conf

# Entrypoint script: set Apache to listen on $PORT
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["apache2-foreground"]
