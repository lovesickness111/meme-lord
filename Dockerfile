# syntax=docker/dockerfile:1

FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY ui ./ui
RUN npm run build

FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY assets ./assets
RUN ln -s /app/dist/cli.js /usr/local/bin/meme \
  && ln -s /app/dist/mcp.js /usr/local/bin/meme-maker-mcp \
  && chmod +x dist/cli.js dist/mcp.js \
  && mkdir -p /home/node/.meme-maker && chown -R node:node /home/node/.meme-maker
USER node
ENV MEME_UI_HOST=0.0.0.0
EXPOSE 3456
ENTRYPOINT ["meme"]
CMD ["ui", "--port", "3456"]
