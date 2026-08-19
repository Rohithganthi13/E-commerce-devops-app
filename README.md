# ShopSphere — Node.js E-Commerce on AWS ECS with CI/CD

ShopSphere is a Node.js e-commerce application with an EJS-rendered frontend and MongoDB Atlas backend.

The project was progressively upgraded from a locally running Node.js application into a containerized AWS deployment using Docker, Amazon ECR, Amazon ECS with AWS Fargate, an Application Load Balancer, CloudWatch Logs, AWS CodeBuild, and AWS CodePipeline.

Current status: The AWS resources used for the hands-on deployment were intentionally deleted after validation to avoid ongoing cloud costs. This repository documents the validated architecture, application, Docker configuration, and CI/CD workflow so the environment can be recreated later.

## Architecture

flowchart TB
    Dev[Developer] -->|git push| GitHub[GitHub]
    GitHub --> CP[CodePipeline]
    CP --> Source[Source Stage]
    Source --> CB[CodeBuild]
    CB --> Push[Docker build, tag and push]
    Push --> ECR[(Amazon ECR)]
    CB --> Artifact[imagedefinitions.json]
    ECR --> ECS[ECS Service]
    Artifact --> ECS
    ECS --> T1[Fargate Task 1]
    ECS --> T2[Fargate Task 2]
    T1 --> TG[Target Group\nHTTP :3000\n/health]
    T2 --> TG
    TG --> ALB[Application Load Balancer\nHTTP :80]
    ALB --> Users[Users]
    T1 --> Atlas[(MongoDB Atlas)]
    T2 --> Atlas
    Logs[CloudWatch Logs] --- T1
    Logs --- T2

## Application Stack

| Layer              | Technology                |
| ------------------ | ------------------------- |
| Runtime            | Node.js 20                |
| Web Framework      | Express                   |
| Frontend           | EJS                       |
| Database           | MongoDB Atlas             |
| Containerization   | Docker                    |
| Registry           | Amazon ECR                |
| Compute            | Amazon ECS / AWS Fargate  |
| Load Balancer      | Application Load Balancer |
| CI                 | AWS CodeBuild             |
| CD / Orchestration | AWS CodePipeline          |
| Logs               | Amazon CloudWatch Logs    |
| Source Control     | Git                       |


## Application Structure

.
├── app.js
├── controllers/
├── data/
├── models/
├── public/
├── routes/
├── utils/
├── views/
├── Dockerfile
├── .dockerignore
├── buildspec.yml
├── package.json
├── package-lock.json
└── README.md

## Local Development

### Prerequisites

Node.js 20+

npm

Docker / Docker Compose

MongoDB Atlas

## Environment variable

Create a local .env file:

MONGO_URL=mongodb+srv://<username>:<password>@<cluster>/<database>

Never commit .env to Git.

## Run with Node.js

npm ci
node app.js

Application:

http://localhost:3000

Health check:

http://localhost:3000/health

## Run with Docker Compose

docker compose up --build

## Docker

The application is containerized with Node.js Alpine:

FROM node:20-alpine

WORKDIR /home/node

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 3000

CMD ["node", "app.js"]

Build locally:

docker build -t e-commerce-node-app .

Run locally:

docker run --rm \
  --name shopsphere-app \
  -p 3000:3000 \
  --env-file .env \
  e-commerce-node-app

## Health Check

The application exposes:

GET /health

Response:

{
  "status": "healthy"
}

The endpoint is intentionally lightweight and was used by the ALB Target Group health check.

## AWS Architecture

### VPC

A dedicated VPC was used for the learning deployment. Example network layout:

VPC:       10.0.0.0/16
Subnet A:  10.0.0.0/24
Subnet B:  10.0.1.0/24

The subnets were placed in different Availability Zones. The learning deployment used an Internet Gateway and public-subnet routing.

For a hardened production design, ECS tasks should be placed in private subnets with appropriate NAT Gateway and/or VPC endpoint access.

## Security Groups

### ALB Security Group

Inbound:
HTTP :80
Source: 0.0.0.0/0

## ECS Task Security Group

Inbound:
TCP :3000
Source: ALB Security Group

This prevents users from bypassing the load balancer and directly reaching the container.

## ECS

### Cluster

ShopSphere-Cluster

### Task Definition

Family: shopsphere-task
Launch type: Fargate
CPU: 0.5 vCPU
Memory: 1 GB
Container: shopsphere-app
Container port: 3000

The task definition describes how ECS should run the container: image, CPU/memory, port mappings, environment variables, and logging.

### Service

shopsphere-service
Desired count: 2

The service maintains the desired number of running tasks, replaces failed tasks, and registers/deregisters task IPs with the Target Group.

### Application Load Balancer

Name: ShopSphere-ALB
Scheme: Internet-facing
Listener: HTTP :80

The ALB provides a stable public endpoint while Fargate task IPs can change during task replacement and deployments.

### Target Group

Name: Shopsphere-target-group
Target type: IP
Protocol: HTTP
Port: 3000
Health check path: /health
Success code: 200

Fargate uses task-level networking, so the Target Group registers Fargate task IP addresses.

### MongoDB Atlas

The application connects to MongoDB Atlas using the runtime variable:

MONGO_URL=<MongoDB Atlas connection string>

The database is external to the ECS cluster.

For production, store this value in AWS Secrets Manager rather than plaintext environment configuration.

## CI/CD

### CodeBuild

The CodeBuild project is responsible for:

Authenticating to ECR.

Building the Docker image.

Generating an image tag from the Git commit SHA.

Pushing the image to ECR.

Generating imagedefinitions.json.

Publishing imagedefinitions.json as the build artifact.

### Image tagging

Instead of relying only on latest, the deployment uses immutable commit-based tags such as:

e-commerce-node-app:8f31a2c

This makes deployed versions identifiable and simplifies rollback.

imagedefinitions.json

Example:

[
  {
    "name": "shopsphere-app",
    "imageUri": "<account>.dkr.ecr.<region>.amazonaws.com/e-commerce-node-app:<commit-sha>"
  }
]

The name must match the ECS container name.

### CodePipeline

The pipeline has three stages:

Source
  ↓
Build
  ↓
Deploy

### Source

GitHub source changes trigger the pipeline.

### Build

CodePipeline invokes the existing CodeBuild project. CodeBuild builds and pushes the Docker image and produces imagedefinitions.json.

### Deploy

The ECS deploy action uses the artifact to update the ECS service and perform a rolling deployment.

### End-to-End Deployment Flow

Developer
   ↓ git push
GitHub
   ↓
CodePipeline
   ↓
CodeBuild
   ├── docker build
   ├── commit-SHA tag
   ├── docker push → ECR
   └── imagedefinitions.json
                ↓
             ECS Service
                ↓
        Rolling deployment
                ↓
             Fargate
                ↓
               ALB
                ↓
              Users

### Buildspec

The proven buildspec used by the pipeline is:

version: 0.2

phases:
  pre_build:
    commands:
      - 'echo "Logging into the ECR..."'
      - 'aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com'
      - 'export IMAGE_TAG=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)'
      - 'export IMAGE_URI=$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/e-commerce-node-app:$IMAGE_TAG'
      - 'echo "IMAGE URI: $IMAGE_URI"'

  build:
    commands:
      - 'echo "Building docker image of the application..."'
      - 'docker build -t e-commerce-node-app .'

  post_build:
    commands:
      - 'echo "Tagging the docker image..."'
      - 'docker tag e-commerce-node-app:latest $IMAGE_URI'
      - 'echo "Pushing the docker image to the ECR repository..."'
      - 'docker push $IMAGE_URI'
      - 'echo "Generating imagedefinitions.json..."'
      - "printf '[{\"name\":\"shopsphere-app\",\"imageUri\":\"%s\"}]' \"$IMAGE_URI\" > imagedefinitions.json"
      - 'cat imagedefinitions.json'

artifacts:
  files:
    - imagedefinitions.json

## Troubleshooting Lessons

ECS task exits with code 1

The investigation path was:

ECS Service
  ↓
Task status
  ↓
Stopped reason / exit code
  ↓
CloudWatch Logs

The application was failing during MongoDB authentication. The fix was to correct and rotate the database credential and deploy a new task-definition revision.

### ALB SSL error

The ALB was configured only with HTTP :80. Accessing it with https:// produced an SSL protocol error. Accessing the HTTP endpoint worked.

### Target registration verification

ECS service events showed target registration/deregistration during rolling deployments. The AWS CLI was used to verify the authoritative target state:

aws elbv2 describe-target-health \
  --target-group-arn <target-group-arn>

The final deployment had two healthy Fargate task IPs registered on port 3000.

## Security Improvements

The validated learning deployment should be hardened further before a long-lived production environment:

[] Move MONGO_URL to AWS Secrets Manager.

[] Use least-privilege IAM policies for CodeBuild.

[] Use private subnets for ECS tasks.

[] Add HTTPS with AWS Certificate Manager.

[] Add a Route 53 custom domain.

[] Add CloudWatch alarms and dashboards.

[] Configure ECS Service Auto Scaling.

[] Add deployment approvals/protections where appropriate.

[] Provision infrastructure with Terraform.

## Key Design Principles

Dockerfile
  → How the image is built

CodeBuild
  → Build and publish the image

ECR
  → Store container images

Task Definition
  → Describe how the container runs

ECS Task
  → Run the container

ECS Service
  → Maintain the desired task count

Target Group
  → Track healthy task IPs

ALB
  → Receive and route user traffic

CodePipeline
  → Orchestrate the CI/CD workflow

This separation of responsibilities makes the architecture easier to operate, debug, scale, and automate.

## Project Status

Application                  ✅
Docker                       ✅
Amazon ECR                  ✅
ECS Fargate                 ✅
ECS Service                 ✅
Application Load Balancer   ✅
Target Group                ✅
Health Checks               ✅
CloudWatch Logs             ✅
CodeBuild                   ✅
CodePipeline                ✅
Automated ECS Deployment    ✅
Commit-based Image Tags     ✅
Secrets Manager             ⏳
Auto Scaling                ⏳
HTTPS / Custom Domain       ⏳
Private ECS Subnets         ⏳
Terraform                   ⏳

## Next Evolution

The next major phase is Infrastructure as Code with Terraform. The goal is to recreate the validated architecture reproducibly and then add security, observability, auto scaling, and production networking improvements.