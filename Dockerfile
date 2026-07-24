FROM node:24-bookworm-slim

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@11.7.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
RUN pnpm install --frozen-lockfile --prod=false

COPY src src
COPY data data
COPY assets assets
COPY scripts scripts

RUN pnpm build
RUN pnpm prune --prod

ENV NODE_ENV=production

CMD ["node", "dist/bot.js"]
