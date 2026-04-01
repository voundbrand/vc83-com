FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# Copy only polysniper app content needed for the standalone server runtime
COPY server ./server

# Prepare runtime paths and drop root privileges
RUN addgroup -S psnp && \
    adduser -S psnp -G psnp && \
    mkdir -p /app/server/data /app/.runtime && \
    chown -R psnp:psnp /app

USER psnp
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:8787/healthz >/dev/null || exit 1

CMD ["node", "server/server.mjs"]
