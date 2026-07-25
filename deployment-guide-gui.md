# SipSugy — AWS Deployment Guide (Point-and-Click)

The same deployment as `deployment-runbook-cli.md`, done through the AWS
Console, GitHub Desktop, and the Jenkins web UI instead of a terminal.

**Account:** `068765434624`  **Region:** `ap-south-1`

**One honest exception up front:** Docker Desktop's dashboard can run a
container from an existing image, but it can't build a custom image from
a `Dockerfile`, and reliably mounting the Docker socket into a container
isn't exposed in its UI either. Since Jenkins needs the Docker CLI + AWS
CLI baked in (`jenkins/Dockerfile`) to do its job, getting Jenkins started
is the one place this guide uses four terminal commands — after that,
everything is clicking.

---

## Part A — Install local tools (installer wizards, no terminal)

Download and run each installer, clicking through the defaults:
- Git for Windows: https://git-scm.com/download/win
- GitHub Desktop: https://desktop.github.com
- Docker Desktop: https://www.docker.com/products/docker-desktop
- AWS CLI v2 (still needed on the machine, even though you won't type
  commands — Jenkins uses it internally): https://awscli.amazonaws.com/AWSCLIV2.msi
- MySQL Workbench (for loading the schema later, Part G):
  https://dev.mysql.com/downloads/workbench/

Restart after Docker Desktop installs.

---

## Part B — Push the code with GitHub Desktop

1. Create an empty repo at https://github.com/new (e.g. `sipsugy-3tier`) —
   don't add a README, you already have files.
2. Open **GitHub Desktop** → sign in with your GitHub account.
3. **File → Add local repository** → browse to your unzipped project
   folder. If it says the folder isn't a repository yet, click
   **create a repository** in that same dialog.
4. You'll see all the project files listed as changes. Type a summary
   like "Initial commit: 3-tier SipSugy app" → **Commit to main**.
5. Click **Publish repository** (top bar) → uncheck "Keep this code
   private" if you want it public, or leave it checked → **Publish**.

From now on, any time you edit a file: GitHub Desktop shows it under
Changes → write a summary → **Commit to main** → **Push origin**.

---

## Part C — AWS Console: IAM

### Task execution role
1. Open the **IAM console** → **Roles** → **Create role**.
2. Trusted entity type: **AWS service**. Use case: search for
   **Elastic Container Service** → select **Elastic Container Service Task**
   → **Next**.
3. On Permissions, search for **AmazonECSTaskExecutionRolePolicy** → check
   it → **Next**.
4. Role name: `sipsugyEcsTaskExecutionRole` → **Create role**.

### Jenkins deploy policy + user
1. **IAM → Policies → Create policy → JSON tab.** Open
   `iam/jenkins-deploy-policy.json` from the project, copy its contents,
   paste over the editor's contents → **Next**.
2. Name it `SipSugyDeployPolicy` → **Create policy**.
3. **IAM → Users → Create user** → name `jenkins-ecs-deployer` → **Next**.
4. Permissions options: **Attach policies directly** → search
   `SipSugyDeployPolicy` → check it → **Next** → **Create user**.
5. Open the new user → **Security credentials** tab → **Access keys**
   → **Create access key** → choose **Third-party service** → check the
   confirmation box → **Next** → **Create access key**.
6. **Download the .csv** or copy both values now — the secret key is only
   shown this once.

---

## Part D — Get Jenkins running (the one terminal exception)

```powershell
cd path\to\aws-devops-project
docker build -t sipsugy-jenkins ./jenkins
docker volume create jenkins_home
docker run -d --name jenkins -p 8080:8080 -p 50000:50000 -v jenkins_home:/var/jenkins_home -v /var/run/docker.sock:/var/run/docker.sock sipsugy-jenkins
```
That's it for the terminal. Everything from here is in the browser.

1. Get the unlock code: open **Docker Desktop → Containers → jenkins →
   Exec** tab (or **Files** tab, navigate to
   `/var/jenkins_home/secrets/initialAdminPassword`, view it), or use the
   **Terminal** button Docker Desktop shows for the running container.
2. Open http://localhost:8080, paste the code, **Install suggested
   plugins**, then also **Manage Jenkins → Plugins → Available plugins**
   → search **Docker Pipeline** → install, restart if prompted. Create
   your admin user when asked.
3. **Manage Jenkins → Credentials → System → Global credentials → Add
   Credentials** — twice, both kind **Secret text**:
   - ID `AWS_ACCESS_KEY_ID` → value from Part C
   - ID `AWS_SECRET_ACCESS_KEY` → value from Part C
4. If your GitHub repo is private, add a third credential, kind
   **Username with password**: username = your GitHub username, password
   = a GitHub Personal Access Token (GitHub.com → Settings → Developer
   settings → Personal access tokens → generate one with `repo` scope).
5. **New Item** → name `sipsugy` → **Pipeline** → OK.
6. Under **Pipeline**: Definition = **Pipeline script from SCM** → SCM =
   **Git** → Repository URL = your GitHub repo's URL → Credentials =
   the one from step 4 (if private) → Branch = `main` → Script Path =
   `Jenkinsfile` → **Save**.
7. Since Jenkins is local, GitHub can't reach it for a webhook — click
   **Build Now** manually after each push, or set **Build periodically**
   with `H/5 * * * *` under the job's Configure page.

---

## Part E — AWS Console: Frontend (ECR, ALB, ECS)

### ECR repo
**ECR console → Repositories → Create repository** → Visibility: Private
→ Name `sipsugy-frontend` → **Create repository**.

*(The image itself still gets built and pushed by Jenkins, which you
triggered with a click in Part D — you don't push it by hand.)*

### Load balancer
1. **EC2 console → Security Groups → Create security group** → name
   `sipsugy-alb-sg`, VPC: default → Inbound rules → **Add rule**: Type
   HTTP, Source **Anywhere-IPv4** → **Create security group**.
2. Same page again → name `sipsugy-ecs-sg` → Inbound rules → **Add rule**:
   Custom TCP, port 80, Source: select `sipsugy-alb-sg` from the dropdown
   → **Add another rule**: Custom TCP, port 4000, Source: `sipsugy-ecs-sg`
   itself (yes, a security group can reference itself) → **Create**.
3. **EC2 console → Load Balancers → Create load balancer → Application
   Load Balancer.** Name `sipsugy-alb`, scheme **Internet-facing**, VPC:
   default, Mappings: check at least 2 AZs, Security groups:
   `sipsugy-alb-sg`.
4. Listener HTTP:80 → default action → **Create target group** (inline
   link): target type **IP addresses**, name `sipsugy-frontend-tg`,
   protocol HTTP, port 80, VPC default, health check path `/` → Create,
   then select it back on the ALB page → **Create load balancer**.
5. Once created, copy its **DNS name** from the Load Balancers list —
   that's your public URL.

### ECS cluster + Cloud Map namespace
1. **AWS Cloud Map console → Create namespace** → name `sipsugy.local` →
   type **API calls only** (this is the Service Connect–compatible HTTP
   namespace) → **Create namespace**.
2. **ECS console → Clusters → Create cluster** → name `sipsugy-cluster` →
   Infrastructure: check **AWS Fargate (serverless)**. If you see a
   networking/namespace section, select `sipsugy.local` as the default
   namespace. *(If that field isn't shown in your console version, don't
   worry — you'll enable Service Connect per-service below instead,
   which works the same way.)* → **Create**.

### Task definition + service
1. **ECS console → Task definitions → Create new task definition → JSON
   tab.** Open `ecs/frontend-task-def.json`, replace `IMAGE_PLACEHOLDER`
   with `068765434624.dkr.ecr.ap-south-1.amazonaws.com/sipsugy-frontend:latest`,
   paste the whole thing in → **Create**.
2. **Clusters → sipsugy-cluster → Services tab → Create.**
   - Launch type: **Fargate**; Task definition: `sipsugy-frontend`
   - Service name: `sipsugy-frontend-svc`; Desired tasks: `1`
   - Networking: default VPC, select your subnets, security group
     `sipsugy-ecs-sg`, **turn on Public IP**
   - Load balancing: **Application Load Balancer** → existing `sipsugy-alb`
     → listener 80 → target group `sipsugy-frontend-tg` → container
     `frontend:80`
   - Service Connect: toggle **on**, namespace `sipsugy.local` (no alias
     needed for frontend — it only needs to *reach* other services)
   - **Create**
3. Wait for the service to show **1/1 running**, then open the ALB DNS
   name in a browser.

---

## Part F — AWS Console: Backend (ECS + Service Connect)

### ECR repo
**ECR console → Repositories → Create repository** → name `sipsugy-backend`
→ **Create**.

### Task definition + service
1. **ECS console → Task definitions → Create new task definition → JSON
   tab.** Paste `ecs/backend-task-def.json` (leave the `DB_HOST_PLACEHOLDER`
   / `DB_SECRET_ARN_PLACEHOLDER` values for now — Part G fills those in),
   with `IMAGE_PLACEHOLDER` replaced the same way as the frontend → **Create**.
2. **Clusters → sipsugy-cluster → Services → Create.**
   - Task definition: `sipsugy-backend`; Service name: `sipsugy-backend-svc`
   - Networking: same subnets, security group `sipsugy-ecs-sg`, Public IP **on**
   - Load balancing: **None** — the backend is never public
   - Service Connect: toggle **on**, namespace `sipsugy.local`. Under
     **Server** (this service exposes something), add a Service Connect
     service: **Port name** `backend` (this is pulled from the task
     definition's port mapping name), **Discovery name** `backend`,
     **Client alias**: port `4000`, DNS name `backend`.
   - **Create**
3. Once running, redeploy the frontend so it picks up the new alias:
   **Services → sipsugy-frontend-svc → Update service → check "Force new
   deployment" → Update**.
4. Reload the site, place a test order — it should say **"Order sent,"**
   not "Saved on this device." Still in-memory storage until Part G.

Push your changes via GitHub Desktop and click **Build Now** in Jenkins.

---

## Part G — AWS Console: Database (RDS for MySQL)

### Security group + subnet group
1. **EC2 console → Security Groups → Create** → name `sipsugy-db-sg` →
   Inbound rule: Custom TCP, port 3306, Source: `sipsugy-ecs-sg` → **Create**.
2. **RDS console → Subnet groups → Create DB subnet group** → name
   `sipsugy-db-subnet-group`, VPC: default, add all AZ subnets → **Create**.

### Create the database
**RDS console → Databases → Create database:**
- Creation method: **Standard create**
- Engine: **MySQL**
- Templates: **Free tier** (if eligible) or **Dev/Test**
- Settings → DB instance identifier: `sipsugy-db`
- Credentials Settings → Master username: `admin` → check **Manage master
  credentials in AWS Secrets Manager**
- Instance configuration: Burstable classes → `db.t3.micro`
- Storage: 20 GiB
- Connectivity: VPC default → Existing VPC security groups: remove
  `default`, add `sipsugy-db-sg` → Public access: **No**
- Additional configuration → Initial database name: `sipsugy` → Backup
  retention: 7 days
- **Create database** (takes ~10 minutes)

Once status is **Available**:
- **Connectivity & security tab** → copy the **Endpoint** value.
- **Configuration tab** → copy the **Master credentials ARN**.

### Load the schema, with MySQL Workbench
1. Temporarily allow your laptop in:
   - **EC2 console → Security Groups → sipsugy-db-sg → Edit inbound
     rules → Add rule**: Custom TCP 3306, Source: choose **My IP** from
     the dropdown (it fills in your current public IP) → **Save rules**.
   - **RDS console → Databases → sipsugy-db → Modify** → Connectivity →
     Public access: **Yes** → Continue → **Apply immediately**.
2. **Secrets Manager console → Secrets** → find the secret matching your
   Master credentials ARN → **Retrieve secret value** → note the
   `username`/`password`.
3. Open **MySQL Workbench → Database → Connect to Database**: Hostname =
   the RDS endpoint, Port 3306, Username `admin`, Password from step 2 →
   **OK**.
4. **File → Open SQL Script** → select `db/init.sql` from the project →
   click the lightning-bolt **Execute** icon.
5. Revert access:
   - **RDS console → sipsugy-db → Modify** → Public access: **No** →
     **Apply immediately**.
   - **EC2 console → sipsugy-db-sg → Edit inbound rules** → delete the
     "My IP" rule you added → **Save rules**.

### Let the backend read the DB password
**IAM console → Roles → sipsugyEcsTaskExecutionRole → Add permissions →
Create inline policy → JSON tab.** Paste `iam/ecs-secrets-policy.json`,
replacing `DB_SECRET_ARN_PLACEHOLDER` with the Master credentials ARN you
copied → **Next** → name `SipSugyReadDbSecret` → **Create policy**.

### Point the backend at RDS
1. **ECS console → Task definitions → sipsugy-backend → Create new
   revision → JSON tab.** Replace `DB_HOST_PLACEHOLDER` with the RDS
   endpoint and `DB_SECRET_ARN_PLACEHOLDER` with the Master credentials
   ARN → **Create**.
2. **Clusters → sipsugy-cluster → Services → sipsugy-backend-svc →
   Update service** → Task definition revision: **Latest** → check
   **Force new deployment** → **Update**.
3. **CloudWatch console → Log groups → /ecs/sipsugy-backend** → open the
   latest stream → look for `Connected to MySQL.`
4. Place an order on the live site, then repeat the "force new
   deployment" step on the backend service and reload — the order should
   still be there, proving it's really in RDS.

Commit the two changed files via GitHub Desktop and click **Build Now** in
Jenkins one more time to confirm the pipeline still runs clean end to end.

---

## Cost & cleanup (console)
- `db.t3.micro` ≈ $12–13/month running continuously.
- To tear down: **ECS →** delete both services, then the cluster.
  **RDS →** Delete (uncheck final snapshot if you don't need one).
  **EC2 →** delete the load balancer, target group, and security groups.
  **ECR →** delete both repositories.
