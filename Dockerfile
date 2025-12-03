# Debian 13
FROM debian:trixie AS build

ARG PRODUCT_VERSION="9.2.0"

RUN <<EOF
  apt update
  apt install -y nodejs npm node-grunt-cli
EOF

RUN --mount=type=bind,source=./,target=/temp,rw <<EOF
  export PRODUCT_VERSION=${PRODUCT_VERSION}

  cd /temp/build

  npm install

  grunt

  # Persist the built files in the image
  cp -r /temp/deploy/web-apps /web-apps
EOF

FROM alpine:3.22

COPY --from=build /web-apps /web-apps
