FROM mysql:8.0

# Runs automatically against $MYSQL_DATABASE the first time the container
# starts with an empty data directory. Credentials/db name are supplied at
# run time (see docker-compose.yml or db/.env.example) — never baked in here.
COPY init.sql /docker-entrypoint-initdb.d/init.sql

EXPOSE 3306
