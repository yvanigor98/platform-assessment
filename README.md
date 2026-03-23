# Platform Engineering Assessment — SFH Rwanda

## Overview

This repository contains a production-like platform for a Node.js application built using AWS CDK, Kubernetes, Ansible, GitHub Actions, and Prometheus/Grafana. The entire stack runs locally without requiring an AWS account.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  GitHub Actions CI/CD                │
│         test → build → push → deploy                │
│         ansible-lint runs in parallel               │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│              AWS Infrastructure (CDK)                │
│   NetworkStack → EcrStack → EksStack                │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│         Kubernetes Cluster (kind locally)            │
│                                                      │
│   Ingress → Service → Pod1 / Pod2                   │
│                                                      │
│   ┌──────────────────────────────────────────────┐  │
│   │         Monitoring Namespace                  │  │
│   │   Prometheus + Grafana + Loki                │  │
│   └──────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│                    Ansible                           │
│        common role + monitoring role                 │
│     targets EC2 instances / local container          │
└─────────────────────────────────────────────────────┘
```

---

## Assessment Checklist

| Part   | Task                                                          | Status  |
| ------ | ------------------------------------------------------------- | ------- |
| Part 1 | NetworkStack — VPC, public/private subnets, NAT gateway       | ✅ Done |
| Part 1 | EcrStack — private ECR repository                             | ✅ Done |
| Part 1 | EksStack — EKS cluster, managed node group, IAM role          | ✅ Done |
| Part 1 | `cdk synth` output committed                                  | ✅ Done |
| Part 2 | Node.js app with `/`, `/health`, `/metrics` endpoints         | ✅ Done |
| Part 2 | Multi-stage Dockerfile, non-root user, commit SHA tag         | ✅ Done |
| Part 2 | Kubernetes Deployment — 2 replicas, liveness/readiness probes | ✅ Done |
| Part 2 | Resource requests and limits                                  | ✅ Done |
| Part 2 | Service and Ingress with host rule                            | ✅ Done |
| Part 2 | Prometheus annotations on pods                                | ✅ Done |
| Part 3 | Ansible inventory with host groups, no hardcoded IPs          | ✅ Done |
| Part 3 | common role — hardening, deploy user, SSH, UFW, timezone      | ✅ Done |
| Part 3 | monitoring role — Prometheus Node Exporter                    | ✅ Done |
| Part 3 | site.yaml master playbook, idempotent                         | ✅ Done |
| Part 4 | GitHub Actions CI pipeline — lint, test, build, push          | ✅ Done |
| Part 4 | GitHub Actions CD pipeline — deploy, rollback on failure      | ✅ Done |
| Part 4 | Images tagged with commit SHA                                 | ✅ Done |
| Part 4 | No hardcoded secrets                                          | ✅ Done |
| Part 5 | Prometheus scraping app metrics via annotations               | ✅ Done |
| Part 5 | Grafana dashboard — HTTP request rate, pod CPU                | ✅ Done |
| Part 5 | Alert rule — pod unready for more than 2 minutes              | ✅ Done |
| Part 5 | Grafana dashboard screenshot + JSON exported                  | ✅ Done |
| Part 6 | Architecture overview                                         | ✅ Done |
| Part 6 | Prerequisites and setup guide                                 | ✅ Done |
| Part 6 | Design decisions and trade-offs                               | ✅ Done |
| Bonus  | Structured JSON logging with Winston                          | ✅ Done |
| Bonus  | Grafana Loki deployed via Helm                                | ✅ Done |
| Bonus  | Ansible lint integrated into CI/CD pipeline                   | ✅ Done |

---

## Prerequisites

| Tool    | Version | Install                                                                                                                         |
| ------- | ------- | ------------------------------------------------------------------------------------------------------------------------------- | ----- |
| Docker  | 28.x    | `sudo apt install docker.io`                                                                                                    |
| kubectl | v1.31.x | `sudo snap install kubectl --classic`                                                                                           |
| kind    | v0.22.0 | `curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.22.0/kind-linux-amd64 && chmod +x ./kind && sudo mv ./kind /usr/local/bin/kind` |
| Helm    | v3.x    | `curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3                                                       | bash` |
| Node.js | v18.x   | `nvm install 18`                                                                                                                |
| AWS CDK | 2.x     | `sudo npm install -g aws-cdk typescript ts-node`                                                                                |
| Ansible | 2.16.x  | `sudo apt install -y ansible sshpass`                                                                                           |
| act     | 0.3.x   | `sudo snap install act`                                                                                                         |

---

## Local Setup Guide

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd platform-assessment
```

### 2. Start the Kubernetes cluster

```bash
kind create cluster --name platform
```

### 3. Install NGINX Ingress Controller

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s
```

### 4. Build and load the Docker image

```bash
cd app
docker build -t platform-app:latest .
kind load docker-image platform-app:latest --name platform
cd ..
```

### 5. Deploy the application

```bash
kubectl apply -f k8s/app/
kubectl get pods
```

### 6. Verify the application

```bash
kubectl port-forward svc/platform-app 3000:3000
curl http://localhost:3000/health
curl http://localhost:3000/
curl http://localhost:3000/metrics
```

### 7. Deploy Prometheus and Grafana

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install monitoring prometheus-community/kube-prometheus-stack \
  -f k8s/monitoring/prometheus-values.yaml \
  --namespace monitoring --create-namespace
```

### 8. Deploy Grafana Loki

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
helm install loki grafana/loki-stack \
  --namespace monitoring \
  --set grafana.enabled=false \
  --set prometheus.enabled=false \
  --set loki.persistence.enabled=false
```

### 9. Access Grafana

```bash
kubectl port-forward svc/monitoring-grafana 3001:80 -n monitoring
```

Open http://localhost:3001 — login with `admin` / `platform-admin`

### 10. Run Ansible playbooks

```bash
# Start local target container
docker run -d --name ansible-target \
  -p 2222:22 --privileged ubuntu:22.04 \
  /bin/bash -c "apt-get update && apt-get install -y openssh-server sudo && \
    mkdir /run/sshd && useradd -m -s /bin/bash deploy && \
    echo 'deploy:deploy123' | chpasswd && \
    echo 'deploy ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers && \
    /usr/sbin/sshd -D"

cd ansible
ansible-playbook -i inventory/hosts.yaml site.yaml
```

### 11. Synthesize CDK infrastructure

```bash
cd infra
cdk synth
```

---

## Design Decisions

**Why three separate CDK stacks?**
Separating NetworkStack, EcrStack, and EksStack means each can be updated independently. Changing the EKS cluster configuration doesn't risk touching the network. Clean separation of concerns that mirrors how real infrastructure teams manage resources.

**Why multi-stage Docker build?**
The builder stage compiles TypeScript. The production stage only copies the compiled output and production dependencies. The final image has no TypeScript compiler or dev tooling — smaller attack surface and faster pull times.

**Why tag images with commit SHA?**
Every image is traceable to the exact commit that produced it. If a bug is introduced, you know exactly which commit caused it and can roll back to the previous SHA. `:latest` is ambiguous and dangerous in production deployments.

**Why kind over minikube?**
kind is faster to start, uses less memory, and is the recommended local Kubernetes tool for CI pipelines. It maps more closely to how EKS provisions clusters.

**Why separate CI and CD workflows?**
CI (test + build) and CD (deploy) have different triggers and different failure modes. Separating them means a failed deployment doesn't block the next build, and deployment can be re-triggered independently without re-running tests.

**Why Winston for logging?**
Winston outputs structured JSON logs — every log line is a parseable object with `level`, `message`, `timestamp`, and request context. This makes logs queryable in Loki and compatible with any log aggregation platform.

---

## Trade-offs and Honest Limitations

**UFW in Docker containers**
UFW firewall configuration in the Ansible common role is skipped when running inside a Docker container (`when: ansible_virtualization_type != "docker"`). Docker containers don't run systemd as PID 1 and manage their own network namespace. On a real EC2 instance, UFW runs as expected and blocks all incoming traffic except SSH.

**systemd in Docker**
Node Exporter is installed correctly but cannot be started via systemd in the Docker container target. The binary and service file are in place — on a real EC2 instance it starts automatically on boot.

**Loki memberlist in kind**
Loki is deployed and configured as a Grafana datasource. The deprecated loki-stack chart has a known memberlist communication issue in kind clusters due to how Docker networking works locally. On a real Kubernetes cluster with proper networking this resolves correctly.

**CDK synth only**
No AWS account was used. `cdk synth` generates valid CloudFormation templates committed to the repository. `cdk deploy` would work with a real AWS account after running `cdk bootstrap` first.

**Local registry vs ECR**
For local development we use a local Docker registry. In production this is replaced by the ECR repository provisioned by the CDK EcrStack.

---

## What I Would Improve Given More Time

- Add proper unit and integration tests for the Node.js application
- Use OIDC authentication between GitHub Actions and AWS instead of long-lived secrets
- Add network policies to restrict pod-to-pod communication
- Implement horizontal pod autoscaling based on the Prometheus CPU metrics we already collect

---

## Ansible Roles

| Role         | Description                                                                                                                                          |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `common`     | Baseline OS hardening: non-root deploy user, disable root SSH, UFW firewall (EC2 only), timezone set to Africa/Kigali, system file descriptor limits |
| `monitoring` | Downloads and installs Prometheus Node Exporter as a systemd service, exposes host metrics on port 9100                                              |

---

## Ansible Vault — Secrets Management

Sensitive values in the inventory are encrypted using `ansible-vault` and never stored as plaintext in the repository.

The following variables are encrypted:

- `ansible_password` — SSH password for the deploy user
- `ansible_sudo_pass` — sudo password for privilege escalation

To run the playbooks you need the vault password. Create a vault password file:

```bash
echo 'your-vault-password' > ~/.vault_password
chmod 600 ~/.vault_password
```

Then run the playbook with:

```bash
ansible-playbook -i inventory/hosts.yaml site.yaml --vault-password-file ~/.vault_password
```

Or interactively:

```bash
ansible-playbook -i inventory/hosts.yaml site.yaml --ask-vault-pass
```

> **Note:** Never commit the vault password file to the repository. It is already listed in `.gitignore`.

## Repository Structure

```
platform-assessment/
  app/                    ← Node.js/Express application with Winston logging
  infra/                  ← AWS CDK stacks (NetworkStack, EcrStack, EksStack)
  ansible/                ← Ansible roles and playbooks
  k8s/
    app/                  ← Kubernetes manifests (Deployment, Service, Ingress)
    monitoring/           ← Helm values, alert rules, Grafana dashboard
  .github/workflows/      ← GitHub Actions CI/CD pipelines
  README.md
```
