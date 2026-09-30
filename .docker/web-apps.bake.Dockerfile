# ==============================================================================
# MODULE DOCKERFILE
# This file is not meant to be built standalone. It is consumed by the 
# docker-bake.hcl files in the parent monorepos.
# ==============================================================================

ARG PRODUCT_VERSION
ARG BUILD_ROOT

#### BASE ####
FROM ubuntu:26.04 AS web-base
    RUN apt-get update && \
        apt-get install -y ca-certificates curl gnupg openjdk-21-jdk wget zip brotli bzip2 && \
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
        apt-get install -y nodejs && \
        npm install -g @yao-pkg/pkg && \
        rm -rf /var/lib/apt/lists/*

#### WEB-APPS ####
FROM web-base AS web-apps
    ARG PRODUCT_VERSION
    ARG BUILD_ROOT=/package

    COPY web-apps/build/package*.json /app/build/

    RUN --mount=type=cache,target=/root/.npm \
        cd app/build && \
        npm install

    COPY web-apps/ /app

    ENV PRODUCT_VERSION=${PRODUCT_VERSION}
    ENV BUILD_ROOT=${BUILD_ROOT}

    RUN cd app/translation && \
        python3 merge_and_check.py

    RUN cd app/build && \
        BUILD_ROOT=${BUILD_ROOT} PRODUCT_VERSION=${PRODUCT_VERSION} THEME=euro-office \
        node scripts/build-pipeline.js