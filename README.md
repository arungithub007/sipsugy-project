# SipSugy — 3-Tier AWS DevOps Project

Fresh sugarcane juice, ordered online. Deployed as a 3-tier app on AWS.

## Status

| Tier              | Stack                       | Local (Docker Compose) | AWS                              |
|-------------------|------------------------------|-------------------------|-----------------------------------|
| Frontend + proxy  | React (Vite) → Nginx         | ✅                       | ✅ ECS Fargate + ALB               |
| Backend           | Node.js (Express)             | ✅                       | ✅ ECS Fargate (Service Connect)   |
| Database          | MySQL 8                       | ✅ (container)           | ✅ Amazon RDS for MySQL            |
| CI/CD             | Jenkins (local, Docker)       | —                        | ✅ builds/pushes/deploys all three |

AWS account: `068765434624`  ·  Region: `ap-south-1`

## Run everything locally

```bash
cp db/.env.example .env
docker compose up --build
```
- Backend API directly: http://localhost:4000/api/health
- MySQL: localhost:3306

## Run in AWS

See the deployment walkthrough (chat history / `senarios.md`-style runbook)
for exact commands. Summary of what's provisioned:

- **ECS cluster** `sipsugy-cluster` (Fargate, Service Connect namespace `sipsugy.local`)
- **Frontend service** `sipsugy-frontend-svc` — public, behind ALB `sipsugy-alb`
- **Backend service** `sipsugy-backend-svc` — private, reachable only as
  `backend:4000` from other services in the namespace (matches
  `frontend/nginx.conf`'s `proxy_pass` unchanged)
- **Database**: Amazon RDS for MySQL (`sipsugy-db`), private subnet, only
  reachable from the ECS tasks' security group. Master password is managed
  by RDS in Secrets Manager — never stored in plaintext anywhere in this
  repo or in Jenkins.
- **CI/CD**: Jenkins running locally in Docker Desktop (`jenkins/Dockerfile`),
  pipeline defined in `Jenkinsfile` — tests both tiers, builds all images,
  pushes to ECR, and force-redeploys both ECS services on every run.

## Layout

```
aws-devops-project/
├── frontend/          React + Vite, Dockerfile, nginx.conf (reverse proxy)
├── backend/           Node.js + Express API, Dockerfile
├── db/                MySQL schema (init.sql), Dockerfile — used for local
│                      dev; production data lives in RDS instead
├── ecs/               ECS task definitions + Service Connect configs
├── iam/               IAM trust policy + deploy/secrets policies
├── jenkins/           Custom Jenkins image (Docker CLI + AWS CLI)
├── docker-compose.yml runs all three together, locally
└── Jenkinsfile        CI/CD pipeline (real AWS account/region wired in)
```

## Possible next steps

- Route 53 + ACM for a real domain and HTTPS (currently HTTP-only on the ALB)
- Enable RDS Multi-AZ for high availability (currently single-AZ, for cost)
- Move ECS tasks into private subnets + a NAT gateway (currently public
  subnets with public IPs, for simplicity)
- CloudWatch alarms on ECS/RDS metrics
