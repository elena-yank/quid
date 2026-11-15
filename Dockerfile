FROM node:22-bookworm AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN node scripts/unpack-assets.mjs
ENV NITRO_PRESET=node-server
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
RUN npm init -y >/dev/null \
  && npm pkg set type=module >/dev/null \
  && npm i --omit=dev pg@8.16.3
COPY --from=build /app/.output ./.output
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=build /app/scripts/migration-plan.mjs ./scripts/migration-plan.mjs
COPY --from=build /app/scripts/ensure-db.mjs ./scripts/ensure-db.mjs
COPY docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
EXPOSE 3000
CMD ["/entrypoint.sh"]
