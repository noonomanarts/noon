FROM alpine:3.20

# Alpine's busybox crond is lightweight and reliable; curl is used to hit
# the Next.js app's /api/cron/tick endpoint. No shell tricks — keep it simple.
RUN apk add --no-cache curl tzdata bash ca-certificates && \
    adduser -D -H -s /sbin/nologin cron

ENV TZ=Asia/Muscat

# The crontab file and the runner script are baked into the image so they
# are immutable at runtime; environment variables provide the tunables.
COPY crontab /var/spool/cron/crontabs/root
COPY tick.sh /usr/local/bin/tick.sh
RUN chmod 600 /var/spool/cron/crontabs/root && \
    chmod +x /usr/local/bin/tick.sh

# Run crond in the foreground so Docker tracks liveness correctly.
CMD ["crond", "-f", "-l", "2"]
