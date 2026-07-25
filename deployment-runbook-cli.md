# SipSugy — AWS Deployment Runbook (CLI)

Deploying the SipSugy 3-tier app from a Windows 11 laptop to AWS ECS, using
Git/GitHub, Docker, Jenkins, and the AWS CLI — every command, in order.

**Account:** `068765434624`  **Region:** `ap-south-1`

All commands are PowerShell, run from the project root unless noted.

---

## Stage 0 — Foundation

### 0.1 Install local tools
```powershell
winget install --id Git.Git -e --source winget
winget install --id Docker.DockerDesktop -e --source winget
winget install --id Amazon.AWSCLI -e --source winget
```
Restart after Docker Desktop installs (needs WSL2). Verify:
```powershell
git --version
docker --version
aws --version
```

### 0.2 Push the code to GitHub
Create an empty repo at https://github.com/new (e.g. `sipsugy-3tier`), then:
```powershell
git config --global user.name "Arun"
git config --global user.email "you@example.com"

cd path\to\aws-devops-project
git init
git add .
git commit -m "Initial commit: 3-tier SipSugy app"
git branch -M main
git remote add origin https://github.com/<your-username>/sipsugy-3tier.git
git push -u origin main
```

### 0.3 Configure the AWS CLI
```powershell
aws configure
# Access Key ID / Secret Access Key: <your credentials>
# Default region: ap-south-1
# Default output: json

aws sts get-caller-identity   # confirm Account = 068765434624
```

### 0.4 IAM: task execution role + Jenkins deploy user
```powershell
aws iam create-role --role-name sipsugyEcsTaskExecutionRole `
  --assume-role-policy-document file://iam/ecs-task-trust-policy.json

aws iam attach-role-policy --role-name sipsugyEcsTaskExecutionRole `
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

aws iam create-user --user-name jenkins-ecs-deployer

aws iam put-user-policy --user-name jenkins-ecs-deployer `
  --policy-name SipSugyDeployPolicy `
  --policy-document file://iam/jenkins-deploy-policy.json

aws iam create-access-key --user-name jenkins-ecs-deployer
# Save the AccessKeyId + SecretAccessKey shown — only shown once.
```

### 0.5 ECS cluster with Service Connect enabled
```powershell
aws ecs create-cluster --cluster-name sipsugy-cluster `
  --service-connect-defaults namespace=sipsugy.local `
  --region ap-south-1
```

### 0.6 Networking — default VPC + security groups
```powershell
$VPC_ID = aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" `
  --query "Vpcs[0].VpcId" --output text --region ap-south-1

$SUBNETS = aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" `
  --query "Subnets[].SubnetId" --output text --region ap-south-1
$SUBNET_LIST = $SUBNETS -replace "\s+", ","

$ALB_SG = aws ec2 create-security-group --group-name sipsugy-alb-sg `
  --description "SipSugy ALB" --vpc-id $VPC_ID --region ap-south-1 `
  --query "GroupId" --output text
aws ec2 authorize-security-group-ingress --group-id $ALB_SG `
  --protocol tcp --port 80 --cidr 0.0.0.0/0 --region ap-south-1

$ECS_SG = aws ec2 create-security-group --group-name sipsugy-ecs-sg `
  --description "SipSugy ECS tasks" --vpc-id $VPC_ID --region ap-south-1 `
  --query "GroupId" --output text
aws ec2 authorize-security-group-ingress --group-id $ECS_SG `
  --protocol tcp --port 80 --source-group $ALB_SG --region ap-south-1
aws ec2 authorize-security-group-ingress --group-id $ECS_SG `
  --protocol tcp --port 4000 --source-group $ECS_SG --region ap-south-1
```
*(Using the default VPC's public subnets keeps this achievable without a
NAT gateway — Fargate tasks get a public IP to reach ECR. A private-subnet
+ NAT setup is a hardening step for later.)*

### 0.7 Jenkins, running locally in Docker Desktop
```powershell
cd path\to\aws-devops-project
docker build -t sipsugy-jenkins ./jenkins
docker volume create jenkins_home
docker run -d --name jenkins `
  -p 8080:8080 -p 50000:50000 `
  -v jenkins_home:/var/jenkins_home `
  -v /var/run/docker.sock:/var/run/docker.sock `
  sipsugy-jenkins

docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```
Open http://localhost:8080, unlock, install suggested plugins + **Docker
Pipeline**. Add two credentials (Manage Jenkins → Credentials → System →
Global), kind **Secret text**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
(from step 0.4). Create a Pipeline job named `sipsugy` → Pipeline script
from SCM → Git → your repo URL → branch `main` → script path `Jenkinsfile`.

---

## Stage 1 — Frontend (ECR, ALB, ECS)

```powershell
# ECR repo + first manual push
aws ecr create-repository --repository-name sipsugy-frontend --region ap-south-1
aws ecr get-login-password --region ap-south-1 | `
  docker login --username AWS --password-stdin 068765434624.dkr.ecr.ap-south-1.amazonaws.com
docker build -t sipsugy-frontend ./frontend
docker tag sipsugy-frontend:latest 068765434624.dkr.ecr.ap-south-1.amazonaws.com/sipsugy-frontend:latest
docker push 068765434624.dkr.ecr.ap-south-1.amazonaws.com/sipsugy-frontend:latest

# Log group
aws logs create-log-group --log-group-name /ecs/sipsugy-frontend --region ap-south-1

# ALB + target group + listener
$ALB_ARN = aws elbv2 create-load-balancer --name sipsugy-alb `
  --subnets $SUBNETS --security-groups $ALB_SG `
  --scheme internet-facing --type application --region ap-south-1 `
  --query "LoadBalancers[0].LoadBalancerArn" --output text

$TG_ARN = aws elbv2 create-target-group --name sipsugy-frontend-tg `
  --protocol HTTP --port 80 --vpc-id $VPC_ID --target-type ip `
  --health-check-path / --region ap-south-1 `
  --query "TargetGroups[0].TargetGroupArn" --output text

aws elbv2 create-listener --load-balancer-arn $ALB_ARN `
  --protocol HTTP --port 80 `
  --default-actions Type=forward,TargetGroupArn=$TG_ARN --region ap-south-1

aws elbv2 describe-load-balancers --names sipsugy-alb --region ap-south-1 `
  --query "LoadBalancers[0].DNSName" --output text
# ^ this is your public URL

# Task def (edit ecs/frontend-task-def.json first: replace IMAGE_PLACEHOLDER
# with 068765434624.dkr.ecr.ap-south-1.amazonaws.com/sipsugy-frontend:latest,
# then revert it afterwards — Jenkins owns real tags from here)
aws ecs register-task-definition --cli-input-json file://ecs/frontend-task-def.json --region ap-south-1

# Service
aws ecs create-service --cluster sipsugy-cluster `
  --service-name sipsugy-frontend-svc `
  --task-definition sipsugy-frontend `
  --desired-count 1 --launch-type FARGATE `
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_LIST],securityGroups=[$ECS_SG],assignPublicIp=ENABLED}" `
  --load-balancers "targetGroupArn=$TG_ARN,containerName=frontend,containerPort=80" `
  --service-connect-configuration "enabled=true,namespace=sipsugy.local" `
  --region ap-south-1
```
Verify: `aws ecs describe-services --cluster sipsugy-cluster --services sipsugy-frontend-svc --region ap-south-1` shows `running: 1`, then open the ALB DNS name in a browser.

Commit + push, then click **Build Now** in Jenkins:
```powershell
git add Jenkinsfile ecs iam jenkins .gitignore
git commit -m "Add ECS/IAM/Jenkins deployment files"
git push
```

---

## Stage 2 — Backend (ECR, ECS, Service Connect)

```powershell
# Security: allow port 4000 between ECS tasks (already added in 0.6)

# ECR repo + first manual push
aws ecr create-repository --repository-name sipsugy-backend --region ap-south-1
aws ecr get-login-password --region ap-south-1 | `
  docker login --username AWS --password-stdin 068765434624.dkr.ecr.ap-south-1.amazonaws.com
docker build -t sipsugy-backend ./backend
docker tag sipsugy-backend:latest 068765434624.dkr.ecr.ap-south-1.amazonaws.com/sipsugy-backend:latest
docker push 068765434624.dkr.ecr.ap-south-1.amazonaws.com/sipsugy-backend:latest

aws logs create-log-group --log-group-name /ecs/sipsugy-backend --region ap-south-1

# Task def (edit ecs/backend-task-def.json: replace IMAGE_PLACEHOLDER same as
# above; leave DB_HOST_PLACEHOLDER / DB_SECRET_ARN_PLACEHOLDER for Stage 3)
aws ecs register-task-definition --cli-input-json file://ecs/backend-task-def.json --region ap-south-1

# Service — no ALB; reached only via Service Connect as "backend:4000"
aws ecs create-service --cluster sipsugy-cluster `
  --service-name sipsugy-backend-svc `
  --task-definition sipsugy-backend `
  --desired-count 1 --launch-type FARGATE `
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_LIST],securityGroups=[$ECS_SG],assignPublicIp=ENABLED}" `
  --service-connect-configuration file://ecs/backend-service-connect.json `
  --region ap-south-1

# Nudge frontend to pick up the new alias
aws ecs update-service --cluster sipsugy-cluster --service sipsugy-frontend-svc `
  --force-new-deployment --region ap-south-1
```
Verify both services show `running: 1`, then reload the site and place a
test order — confirmation should say **"Order sent"**, not "Saved on this
device". Still in-memory storage until Stage 3.

```powershell
git add Jenkinsfile ecs
git commit -m "Add backend ECS deployment (Service Connect)"
git push
```
Click **Build Now** in Jenkins.

---

## Stage 3 — Database (Amazon RDS for MySQL)

```powershell
# Subnet group + security group
aws rds create-db-subnet-group --db-subnet-group-name sipsugy-db-subnet-group `
  --db-subnet-group-description "SipSugy RDS subnets" `
  --subnet-ids $SUBNETS --region ap-south-1

$DB_SG = aws ec2 create-security-group --group-name sipsugy-db-sg `
  --description "SipSugy RDS" --vpc-id $VPC_ID --region ap-south-1 `
  --query "GroupId" --output text
aws ec2 authorize-security-group-ingress --group-id $DB_SG `
  --protocol tcp --port 3306 --source-group $ECS_SG --region ap-south-1

# RDS instance — master password auto-generated into Secrets Manager
aws rds create-db-instance `
  --db-instance-identifier sipsugy-db `
  --db-instance-class db.t3.micro `
  --engine mysql `
  --allocated-storage 20 `
  --master-username admin `
  --manage-master-user-password `
  --db-name sipsugy `
  --vpc-security-group-ids $DB_SG `
  --db-subnet-group-name sipsugy-db-subnet-group `
  --backup-retention-period 7 `
  --no-publicly-accessible `
  --region ap-south-1

aws rds wait db-instance-available --db-instance-identifier sipsugy-db --region ap-south-1

$DB_ENDPOINT = aws rds describe-db-instances --db-instance-identifier sipsugy-db `
  --query "DBInstances[0].Endpoint.Address" --output text --region ap-south-1
$DB_SECRET_ARN = aws rds describe-db-instances --db-instance-identifier sipsugy-db `
  --query "DBInstances[0].MasterUserSecret.SecretArn" --output text --region ap-south-1

# Load the schema — briefly open access, run it, then lock back down
$MY_IP = (Invoke-RestMethod -Uri "https://checkip.amazonaws.com").Trim()
aws ec2 authorize-security-group-ingress --group-id $DB_SG `
  --protocol tcp --port 3306 --cidr "$MY_IP/32" --region ap-south-1
aws rds modify-db-instance --db-instance-identifier sipsugy-db `
  --publicly-accessible --apply-immediately --region ap-south-1
aws rds wait db-instance-available --db-instance-identifier sipsugy-db --region ap-south-1

$secret = aws secretsmanager get-secret-value --secret-id $DB_SECRET_ARN `
  --query SecretString --output text --region ap-south-1 | ConvertFrom-Json
Get-Content db\init.sql | docker run -i --rm mysql:8.0 `
  mysql -h $DB_ENDPOINT -u admin -p"$($secret.password)" sipsugy

aws rds modify-db-instance --db-instance-identifier sipsugy-db `
  --no-publicly-accessible --apply-immediately --region ap-south-1
aws ec2 revoke-security-group-ingress --group-id $DB_SG `
  --protocol tcp --port 3306 --cidr "$MY_IP/32" --region ap-south-1

# Let the task execution role read the secret
(Get-Content iam/ecs-secrets-policy.json) -replace 'DB_SECRET_ARN_PLACEHOLDER', $DB_SECRET_ARN |
  Set-Content iam/ecs-secrets-policy.json
aws iam put-role-policy --role-name sipsugyEcsTaskExecutionRole `
  --policy-name SipSugyReadDbSecret --policy-document file://iam/ecs-secrets-policy.json

# Point the backend at RDS and redeploy
(Get-Content ecs/backend-task-def.json) `
  -replace 'DB_HOST_PLACEHOLDER', $DB_ENDPOINT `
  -replace 'DB_SECRET_ARN_PLACEHOLDER', $DB_SECRET_ARN |
  Set-Content ecs/backend-task-def.json
aws ecs register-task-definition --cli-input-json file://ecs/backend-task-def.json --region ap-south-1
aws ecs update-service --cluster sipsugy-cluster --service sipsugy-backend-svc `
  --task-definition sipsugy-backend --force-new-deployment --region ap-south-1
```
Verify: `aws logs tail /ecs/sipsugy-backend --since 5m --region ap-south-1` shows
`Connected to MySQL.`. Place an order, restart the backend task, reload —
the order should still be there.

```powershell
git add ecs/backend-task-def.json iam/ecs-secrets-policy.json README.md
git commit -m "Wire backend to RDS for MySQL"
git push
```
Click **Build Now** in Jenkins — no Jenkinsfile changes needed; `DB_HOST`
and the secret ARN are one-time values already baked into the task
definition file.

---

## Cost & cleanup notes
- `db.t3.micro` ≈ $12–13/month if left running; Multi-AZ roughly doubles
  that (add `--multi-az` to the create-db-instance command if you want it).
- To tear everything down: delete the ECS services, then the cluster,
  then `aws rds delete-db-instance --db-instance-identifier sipsugy-db
  --skip-final-snapshot`, then the ALB, target group, security groups, and
  ECR repos.
