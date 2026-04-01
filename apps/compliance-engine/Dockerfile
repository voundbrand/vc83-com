FROM node:22-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY server ./server
COPY frameworks ./frameworks

RUN mkdir -p /data/compliance/vault

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3335
ENV COMPLIANCE_DB_PATH=/data/compliance/compliance.db
ENV COMPLIANCE_VAULT_PATH=/data/compliance/vault

EXPOSE 3335

VOLUME ["/data/compliance"]

CMD ["node", "--import", "tsx", "server/index.ts"]
