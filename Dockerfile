FROM ubuntu:22.04

RUN apt update \
    && apt upgrade -y \
    && apt install -y ca-certificates curl gnupg unzip

RUN mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg

ARG username=devbox
RUN adduser ${username} && usermod -aG sudo ${username}

RUN echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt update \
    && apt install -y nodejs
RUN curl https://get.volta.sh | bash
RUN apt autoremove

WORKDIR /home/devbox/workspace

