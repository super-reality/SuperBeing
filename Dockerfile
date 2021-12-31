FROM node:latest

RUN apt-get update && \
    apt-get install --no-install-recommends -y

# install node 16 and npm using nvm
# replace shell with bash so we can source files
RUN rm /bin/sh && ln -s /bin/bash /bin/sh

# update the repository sources list
# and install dependencies
RUN apt-get update \
    && apt-get install -y curl \
    && apt-get -y autoclean

RUN npm install --force

# Create app directory
WORKDIR /DigitalBeing

# to make use of caching, copy only package and pip requirement files and install dependencies
COPY package.json .

RUN npm start
