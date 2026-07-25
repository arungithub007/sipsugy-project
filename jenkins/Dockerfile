# Jenkins controller/agent with Docker CLI + AWS CLI v2 added, so pipeline
# steps can run `docker build`/`docker push` (talking to the host's Docker
# engine via the mounted socket — Docker-outside-of-Docker) and `aws ecs
# ...` commands directly.
FROM jenkins/jenkins:lts-jdk17

USER root

# Docker CLI only (not the daemon — we use the host's, via the bind-mounted socket)
RUN apt-get update && \
    apt-get install -y ca-certificates curl gnupg unzip && \
    install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
    chmod a+r /etc/apt/keyrings/docker.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian bookworm stable" \
      > /etc/apt/sources.list.d/docker.list && \
    apt-get update && \
    apt-get install -y docker-ce-cli && \
    rm -rf /var/lib/apt/lists/*

# AWS CLI v2
RUN curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip && \
    unzip -q awscliv2.zip && \
    ./aws/install && \
    rm -rf awscliv2.zip aws

USER jenkins
