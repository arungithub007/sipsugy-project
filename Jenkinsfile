// SipSugy — CI/CD pipeline
// AWS account: 068765434624   Region: ap-south-1
//
// Build-out plan (hierarchical, matching how the app itself was built):
//   Stage 1 (done): frontend — test, build, push to ECR, deploy to ECS
//     Fargate behind an ALB.
//   Stage 2 (this version): backend added — test, build, push, deploy to
//     ECS Fargate, wired to the frontend via ECS Service Connect (alias
//     "backend" on port 4000 — matches nginx.conf's existing proxy_pass,
//     no frontend changes needed).
//   Stage 3 (next): point the backend at RDS for the database tier.
//
// Requires:
//   - Docker Pipeline plugin
//   - A Jenkins agent with Docker CLI + AWS CLI v2 (see jenkins/Dockerfile)
//     and access to the host's Docker socket
//
// Jenkins credentials required (Manage Jenkins > Credentials > System):
//   - AWS_ACCESS_KEY_ID       (kind: Secret text)
//   - AWS_SECRET_ACCESS_KEY   (kind: Secret text)
//   (from the jenkins-ecs-deployer IAM user — see iam/jenkins-deploy-policy.json)

pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  environment {
    AWS_ACCOUNT_ID = '068765434624'
    AWS_REGION     = 'ap-south-1'
    REGISTRY       = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    IMAGE_TAG      = "${env.BUILD_NUMBER}"

    FRONTEND_IMAGE       = "${REGISTRY}/sipsugy-frontend"
    BACKEND_IMAGE        = "${REGISTRY}/sipsugy-backend"

    ECS_CLUSTER          = 'sipsugy-cluster'
    FRONTEND_SERVICE     = 'sipsugy-frontend-svc'
    FRONTEND_TASK_FAMILY = 'sipsugy-frontend'
    BACKEND_SERVICE      = 'sipsugy-backend-svc'
    BACKEND_TASK_FAMILY  = 'sipsugy-backend'
  }

  stages {

    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Test') {
      parallel {
        stage('Backend unit tests') {
          agent { docker { image 'node:20-alpine' } }
          steps {
            dir('backend') {
              sh 'npm install'
              sh 'npm test'
            }
          }
        }
        stage('Frontend build check') {
          agent { docker { image 'node:20-alpine' } }
          steps {
            dir('frontend') {
              sh 'npm install && chmod +x node_modules/.bin/* && npm run build'
            }
          }
        }
      }
    }

    stage('Build & push frontend image') {
      steps {
        withCredentials([
          string(credentialsId: 'AWS_ACCESS_KEY_ID', variable: 'AWS_ACCESS_KEY_ID'),
          string(credentialsId: 'AWS_SECRET_ACCESS_KEY', variable: 'AWS_SECRET_ACCESS_KEY')
        ]) {
          sh '''
            aws ecr get-login-password --region "$AWS_REGION" | \
              docker login --username AWS --password-stdin "$REGISTRY"

            docker build -t "$FRONTEND_IMAGE:$IMAGE_TAG" ./frontend
            docker tag "$FRONTEND_IMAGE:$IMAGE_TAG" "$FRONTEND_IMAGE:latest"

            docker push "$FRONTEND_IMAGE:$IMAGE_TAG"
            docker push "$FRONTEND_IMAGE:latest"
          '''
        }
      }
    }

    stage('Deploy frontend to ECS') {
      steps {
        withCredentials([
          string(credentialsId: 'AWS_ACCESS_KEY_ID', variable: 'AWS_ACCESS_KEY_ID'),
          string(credentialsId: 'AWS_SECRET_ACCESS_KEY', variable: 'AWS_SECRET_ACCESS_KEY')
        ]) {
          sh '''
            sed "s|IMAGE_PLACEHOLDER|$FRONTEND_IMAGE:$IMAGE_TAG|g" \
              ecs/frontend-task-def.json > /tmp/frontend-task-def.rendered.json

            aws ecs register-task-definition \
              --cli-input-json file:///tmp/frontend-task-def.rendered.json \
              --region "$AWS_REGION"

            aws ecs update-service \
              --cluster "$ECS_CLUSTER" \
              --service "$FRONTEND_SERVICE" \
              --task-definition "$FRONTEND_TASK_FAMILY" \
              --force-new-deployment \
              --region "$AWS_REGION"
          '''
        }
      }
    }

    stage('Build & push backend image') {
      steps {
        withCredentials([
          string(credentialsId: 'AWS_ACCESS_KEY_ID', variable: 'AWS_ACCESS_KEY_ID'),
          string(credentialsId: 'AWS_SECRET_ACCESS_KEY', variable: 'AWS_SECRET_ACCESS_KEY')
        ]) {
          sh '''
            aws ecr get-login-password --region "$AWS_REGION" | \
              docker login --username AWS --password-stdin "$REGISTRY"

            docker build -t "$BACKEND_IMAGE:$IMAGE_TAG" ./backend
            docker tag "$BACKEND_IMAGE:$IMAGE_TAG" "$BACKEND_IMAGE:latest"

            docker push "$BACKEND_IMAGE:$IMAGE_TAG"
            docker push "$BACKEND_IMAGE:latest"
          '''
        }
      }
    }

    stage('Deploy backend to ECS') {
      steps {
        withCredentials([
          string(credentialsId: 'AWS_ACCESS_KEY_ID', variable: 'AWS_ACCESS_KEY_ID'),
          string(credentialsId: 'AWS_SECRET_ACCESS_KEY', variable: 'AWS_SECRET_ACCESS_KEY')
        ]) {
          sh '''
            sed "s|IMAGE_PLACEHOLDER|$BACKEND_IMAGE:$IMAGE_TAG|g" \
              ecs/backend-task-def.json > /tmp/backend-task-def.rendered.json

            aws ecs register-task-definition \
              --cli-input-json file:///tmp/backend-task-def.rendered.json \
              --region "$AWS_REGION"

            aws ecs update-service \
              --cluster "$ECS_CLUSTER" \
              --service "$BACKEND_SERVICE" \
              --task-definition "$BACKEND_TASK_FAMILY" \
              --force-new-deployment \
              --region "$AWS_REGION"
          '''
        }
      }
    }

    // -----------------------------------------------------------------
    // STAGE 3 (db) will add here:
    //   - Point the backend task definition's env vars at RDS
    //     (DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME, password pulled
    //     from Secrets Manager rather than hardcoded)
    //   - Verify/apply the schema against the RDS endpoint
    // -----------------------------------------------------------------
  }

  post {
    success {
      echo "Build ${env.BUILD_NUMBER} succeeded — frontend & backend (tag ${IMAGE_TAG}) deployed to ECS."
    }
    failure {
      echo "Build ${env.BUILD_NUMBER} failed — check the stage logs above."
    }
    always {
      sh 'docker image prune -f || true'
    }
  }
}
