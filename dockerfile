FROM jenkins/jenkins:lts

USER root
RUN apt-get update && \
    apt-get install -y docker.io awscli && \
    rm -rf /var/lib/apt/lists/*
# Add jenkins user to docker group
RUN groupadd -f docker && usermod -aG docker jenkins
USER jenkins
