# Git bash -lookup what u already have

```bash
cd /c/path/to/your/project

ALB_ARN=$(aws elbv2 describe-load-balancers --names sipsugy-alb --region ap-south-1 \
  --query "LoadBalancers[0].LoadBalancerArn" --output text)

LISTENER_ARN=$(aws elbv2 describe-listeners --load-balancer-arn "$ALB_ARN" --region ap-south-1 \
  --query "Listeners[0].ListenerArn" --output text)

VPC_ID=vpc-05e08900713bc7b0b
ALB_SG=sg-01f8246baf62282ff
```

# capture the frontend service's current subnets/SG *before* touching it

```bash
FRONTEND_SUBNETS=$(aws ecs describe-services --cluster sipsugy-cluster --services sipsugy-frontend-svc \
  --region ap-south-1 --query "services[0].networkConfiguration.awsvpcConfiguration.subnets" --output text | tr '\t' ',')
FRONTEND_SG=$(aws ecs describe-services --cluster sipsugy-cluster --services sipsugy-frontend-svc \
  --region ap-south-1 --query "services[0].networkConfiguration.awsvpcConfiguration.securityGroups[0]" --output text)

# same for backend
BACKEND_SUBNETS=$(aws ecs describe-services --cluster sipsugy-cluster --services sipsugy-backend-svc \
  --region ap-south-1 --query "services[0].networkConfiguration.awsvpcConfiguration.subnets" --output text | tr '\t' ',')
BACKEND_SG=$(aws ecs describe-services --cluster sipsugy-cluster --services sipsugy-backend-svc \
  --region ap-south-1 --query "services[0].networkConfiguration.awsvpcConfiguration.securityGroups[0]" --output text)

echo "$ALB_ARN / $LISTENER_ARN / $FRONTEND_SUBNETS / $FRONTEND_SG / $BACKEND_SUBNETS / $BACKEND_SG"

```

--- 
# Create the two new target groups

```bash
FRONTEND_TG_ARN=$(aws elbv2 create-target-group --name sipsugy-frontend-tg-80 \
  --protocol HTTP --port 80 --vpc-id "$VPC_ID" --target-type ip \
  --health-check-path / --region ap-south-1 \
  --query "TargetGroups[0].TargetGroupArn" --output text)

BACKEND_TG_ARN=$(aws elbv2 create-target-group --name sipsugy-backend-tg-4000 \
  --protocol HTTP --port 4000 --vpc-id "$VPC_ID" --target-type ip \
  --health-check-path /api/health --region ap-south-1 \
  --query "TargetGroups[0].TargetGroupArn" --output text)

  #(Target group ports are immutable once created — this is why you need new ones rather than editing the 8080 one.)
```

# to remove target group (Remove the Jenkins rule + target group from this ALB)

```bash
JENKINS_RULE_ARN=$(aws elbv2 describe-rules --listener-arn "$LISTENER_ARN" --region ap-south-1 \
  --query "Rules[?Conditions[0].Values[0]=='/jenkins*'].RuleArn" --output text)
aws elbv2 delete-rule --rule-arn "$JENKINS_RULE_ARN" --region ap-south-1

JENKINS_TG_ARN=$(aws elbv2 describe-target-groups --names sipsugy-jenkins-tg-8081 --region ap-south-1 \
  --query "TargetGroups[0].TargetGroupArn" --output text)
aws elbv2 delete-target-group --target-group-arn "$JENKINS_TG_ARN" --region ap-south-1
```

# Point the listener at the new target groups
```bash
# default action -> frontend
aws elbv2 modify-listener --listener-arn "$LISTENER_ARN" \
  --default-actions Type=forward,TargetGroupArn=$FRONTEND_TG_ARN --region ap-south-1

# /api/* -> backend
aws elbv2 create-rule --listener-arn "$LISTENER_ARN" --priority 10 \
  --conditions Field=path-pattern,Values='/api/*' \
  --actions Type=forward,TargetGroupArn=$BACKEND_TG_ARN --region ap-south-1
```
# Open the new ports between the ALB and your tasks
```bash
aws ec2 authorize-security-group-ingress --group-id "$FRONTEND_SG" \
  --protocol tcp --port 80 --source-group "$ALB_SG" --region ap-south-1

aws ec2 authorize-security-group-ingress --group-id "$BACKEND_SG" \
  --protocol tcp --port 4000 --source-group "$ALB_SG" --region ap-south-1
```

# Register the fixed task def, then recreate both services

ECS won't let you change a running service's target group with update-service — it's immutable after creation, so both services need a delete + recreate:
```bash
aws ecs register-task-definition --cli-input-json file://ecs/frontend-task-def.json --region ap-south-1

# --- frontend ---
aws ecs update-service --cluster sipsugy-cluster --service sipsugy-frontend-svc --desired-count 0 --region ap-south-1
aws ecs delete-service --cluster sipsugy-cluster --service sipsugy-frontend-svc --region ap-south-1 --force

aws ecs create-service --cluster sipsugy-cluster --service-name sipsugy-frontend-svc \
  --task-definition sipsugy-frontend --desired-count 1 --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$FRONTEND_SUBNETS],securityGroups=[$FRONTEND_SG],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$FRONTEND_TG_ARN,containerName=frontend,containerPort=80" \
  --region ap-south-1

# --- backend (gets ALB access for the first time, keeps Service Connect too) ---
aws ecs update-service --cluster sipsugy-cluster --service sipsugy-backend-svc --desired-count 0 --region ap-south-1
aws ecs delete-service --cluster sipsugy-cluster --service sipsugy-backend-svc --region ap-south-1 --force

aws ecs create-service --cluster sipsugy-cluster --service-name sipsugy-backend-svc \
  --task-definition sipsugy-backend --desired-count 1 --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$BACKEND_SUBNETS],securityGroups=[$BACKEND_SG],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$BACKEND_TG_ARN,containerName=backend,containerPort=4000" \
  --service-connect-configuration file://ecs/backend-service-connect.json \
  --region ap-south-1
```

# verify
```bash
aws ecs describe-services --cluster sipsugy-cluster --services sipsugy-frontend-svc sipsugy-backend-svc \
  --region ap-south-1 --query "services[].{name:serviceName,running:runningCount}"
```
# push the real image directly

```bash
cd /d/Vamshi_Review/final_porduct/sipsugy-project

aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin 068765434624.dkr.ecr.ap-south-1.amazonaws.com

docker build -t sipsugy-frontend ./frontend
docker tag sipsugy-frontend:latest 068765434624.dkr.ecr.ap-south-1.amazonaws.com/sipsugy-frontend:latest
docker push 068765434624.dkr.ecr.ap-south-1.amazonaws.com/sipsugy-frontend:latest

aws ecs update-service --cluster sipsugy-cluster --service sipsugy-frontend-svc \
  --force-new-deployment --region ap-south-1
```