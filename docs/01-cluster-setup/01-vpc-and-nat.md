# Step 1: VPC, Subnets & Cloud NAT

In enterprise environments, standard practice requires isolating Kubernetes workloads inside dedicated, custom Virtual Private Cloud (VPC) networks. Default VPCs with auto-generated subnets are not recommended for production.

---

## 1. IP Address Planning (IPAM)

Before creating network resources, calculate the required CIDR blocks:

| Resource | Purpose | Recommended CIDR | Usable Addresses | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Node Subnet** | Primary subnet for GKE node VM interfaces | `10.10.0.0/20` | 4,091 IPs | Hosts node VMs and bastion hosts |
| **Pod Secondary Range** | Secondary range for Pod Alias IPs | `10.20.0.0/16` | 65,536 IPs | Dynamically allocated to Pods |
| **Service Secondary Range** | Secondary range for ClusterIPs | `10.30.0.0/20` | 4,096 IPs | Internal virtual IPs for Services |
| **Proxy-Only Subnet** | Regional Managed Envoy proxies | `10.40.0.0/24` | 251 IPs | Required by Gateway API (`gke-l7-rilb`) |
| **Master IPv4 CIDR** | GKE managed control plane | `172.16.0.0/28` | 16 IPs | Non-overlapping private range for API server |

> [!IMPORTANT]
> The **Proxy-Only Subnet** is reserved exclusively for Google Cloud Internal Envoy proxies. Do not deploy VMs or GKE nodes into this subnet. It must have `--purpose=REGIONAL_MANAGED_PROXY` and `--role=ACTIVE`.

---

## 2. Set Environment Variables

If you have not already done so, clone the lab repository so you have access to the helper scripts and Kubernetes manifests:

```bash
git clone https://github.com/amr1k/gke-fundamentals-lab.git
cd gke-fundamentals-lab
```

Export the parameters for your environment:

```bash
export PROJECT_ID=$(gcloud config get-value project)
export REGION="us-central1"
export ZONE="us-central1-a"
export VPC_NAME="gke-enterprise-vpc"
export SUBNET_NAME="gke-nodes-subnet"
export PROXY_SUBNET_NAME="gke-proxy-subnet"
export ROUTER_NAME="gke-router"
export NAT_NAME="gke-nat"

# CIDR Blocks
export NODES_CIDR="10.10.0.0/20"
export PODS_CIDR="10.20.0.0/16"
export SERVICES_CIDR="10.30.0.0/20"
export PROXY_CIDR="10.40.0.0/24"
export MASTER_CIDR="172.16.0.0/28"
```

> [!TIP]
> If `gcloud` verification commands throughout this lab output vertical `KEY: VALUE` pairs instead of formatted horizontal tables, your terminal has screen reader accessibility enabled. Run:
> ```bash
> gcloud config set accessibility/screen_reader false
> ```

---

## 3. Create Custom VPC and Subnets

### 3.1 Create Custom Mode VPC Network
```bash
gcloud compute networks create ${VPC_NAME} \
    --project=${PROJECT_ID} \
    --subnet-mode=custom \
    --bgp-routing-mode=regional
```

### 3.2 Create Primary Subnet with Secondary Ranges
Create the node subnet with secondary alias ranges for Pods and Services:

```bash
gcloud compute networks subnets create ${SUBNET_NAME} \
    --project=${PROJECT_ID} \
    --network=${VPC_NAME} \
    --region=${REGION} \
    --range=${NODES_CIDR} \
    --secondary-range=gke-pods=${PODS_CIDR},gke-services=${SERVICES_CIDR} \
    --enable-private-ip-google-access
```

> [!NOTE]
> `--enable-private-ip-google-access` allows VMs and Pods with private IP addresses to reach Google APIs and services (such as Artifact Registry, Container Registry, and Cloud Logging) using default Google internal IP routes.

### 3.3 Create Regional Proxy-Only Subnet (for Gateway API)
Google Cloud Application Load Balancers (and GKE Gateway API `gke-l7-rilb`) use Envoy proxies deployed into a regional proxy-only subnet:

```bash
gcloud compute networks subnets create ${PROXY_SUBNET_NAME} \
    --project=${PROJECT_ID} \
    --purpose=REGIONAL_MANAGED_PROXY \
    --role=ACTIVE \
    --region=${REGION} \
    --network=${VPC_NAME} \
    --range=${PROXY_CIDR}
```

---

## 4. Deploy Cloud Router & Cloud NAT

Because GKE worker nodes will be created without public IPs (`--enable-private-nodes`), they cannot reach the internet directly. Cloud NAT allows outbound internet connectivity (for pulling container images, security updates, and accessing external SaaS APIs) while strictly blocking unsolicited inbound traffic.

### 4.1 Create Cloud Router
```bash
gcloud compute routers create ${ROUTER_NAME} \
    --project=${PROJECT_ID} \
    --network=${VPC_NAME} \
    --region=${REGION}
```

### 4.2 Create Cloud NAT Gateway
```bash
gcloud compute routers nats create ${NAT_NAME} \
    --project=${PROJECT_ID} \
    --router=${ROUTER_NAME} \
    --region=${REGION} \
    --auto-allocate-nat-external-ips \
    --nat-all-subnet-ip-ranges \
    --enable-logging
```

---

## 5. Configure Firewall Rules

Create firewall rules to allow:
1. Internal VPC communication between Nodes, Pods, and Services.
2. Google Cloud Health Check probes for Load Balancers.
3. SSH access via Identity-Aware Proxy (IAP) for administrative bastion access.

```bash
# Allow internal communication within VPC
gcloud compute firewall-rules create ${VPC_NAME}-allow-internal \
    --project=${PROJECT_ID} \
    --network=${VPC_NAME} \
    --allow=tcp,udp,icmp \
    --source-ranges=10.0.0.0/8 \
    --description="Allow internal traffic across VPC subnets, pods, and services"

# Allow Google Cloud Health Checks
gcloud compute firewall-rules create ${VPC_NAME}-allow-health-checks \
    --project=${PROJECT_ID} \
    --network=${VPC_NAME} \
    --allow=tcp \
    --source-ranges=130.211.0.0/22,35.191.0.0/16 \
    --description="Allow GCP Health Check probes for load balancers and NEGs"

# Allow Identity-Aware Proxy (IAP) for SSH access to Bastions
gcloud compute firewall-rules create ${VPC_NAME}-allow-iap \
    --project=${PROJECT_ID} \
    --network=${VPC_NAME} \
    --allow=tcp:22 \
    --source-ranges=35.235.240.0/20 \
    --description="Allow Cloud IAP tunnel for SSH bastion access"
```

---

## 6. Verification

Verify that your subnets and NAT are provisioned:

```bash
gcloud compute networks subnets list \
    --project=${PROJECT_ID} \
    --filter="network ~ ${VPC_NAME}" \
    --format="table(name, region, ipCidrRange, purpose, role)"
```

**Expected Output:**
```
NAME               REGION       IP_CIDR_RANGE  PURPOSE                 ROLE
gke-nodes-subnet   us-central1  10.10.0.0/20   PRIVATE                 
gke-proxy-subnet   us-central1  10.40.0.0/24   REGIONAL_MANAGED_PROXY  ACTIVE
```

Verify secondary ranges:
```bash
gcloud compute networks subnets describe ${SUBNET_NAME} \
    --region=${REGION} \
    --format="yaml(secondaryIpRanges)"
```

**Expected Output:**
```yaml
secondaryIpRanges:
- ipCidrRange: 10.20.0.0/16
  rangeName: gke-pods
- ipCidrRange: 10.30.0.0/20
  rangeName: gke-services
```

---

## ⏭️ Next Step
Proceed to [**Step 2: Provisioning Private GKE Cluster**](02-private-cluster.md) to create the Kubernetes cluster using this network topology.

