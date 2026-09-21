# Step 2: Provisioning Private GKE Cluster

In this step, you will provision an enterprise-ready private GKE cluster with **Datapath v2 (eBPF)**, **Gateway API**, and **VPC-Native IP Aliasing**.

---

## 1. Enterprise Architecture Features

When provisioning a production GKE cluster, the following architectural choices are critical:

1. **Private Nodes (`--enable-private-nodes`)**: Worker nodes only receive RFC 1918 private IP addresses. No public internet IP addresses are assigned to worker VMs.
2. **Datapath v2 (`--enable-dataplane-v2`)**: Replaces standard `kube-proxy` and `iptables` with an optimized eBPF and Cilium data plane. Provides high-throughput packet routing, built-in network policy enforcement, and enhanced network observability.
3. **Gateway API (`--gateway-api=standard`)**: Installs and manages the GKE Gateway Controller Custom Resource Definitions (CRDs) and reconciliation controllers (`GatewayClass`, `Gateway`, `HTTPRoute`).
4. **VPC-Native Networking (`--enable-ip-alias`)**: Pods receive real IP addresses directly from the VPC's secondary IP alias range, avoiding overlay network encapsulation (e.g., VXLAN/Geneve) overhead.
5. **Workload Identity (`--workload-pool`)**: Binds Kubernetes Service Accounts (KSAs) to Google Cloud IAM Service Accounts (GSAs), eliminating the need for hardcoded JSON service account keys.
6. **Shielded Nodes (`--enable-shielded-nodes`)**: Provides cryptographically verifiable node identity and integrity (Secure Boot, vTPM, Integrity Monitoring).

---

## 2. Set Cluster Variables

Ensure your environment variables are set:

```bash
export CLUSTER_NAME="gke-enterprise-lab"
export REGION="us-central1"
export ZONE="us-central1-a"
export VPC_NAME="gke-enterprise-vpc"
export SUBNET_NAME="gke-nodes-subnet"
export MASTER_CIDR="172.16.0.0/28"
export MACHINE_TYPE="e2-standard-4"
export NUM_NODES=3
```

---

## 3. Provision the Cluster

Execute the following `gcloud` command to create the zonal private cluster:

```bash
gcloud container clusters create ${CLUSTER_NAME} \
    --project=${PROJECT_ID} \
    --zone=${ZONE} \
    --machine-type=${MACHINE_TYPE} \
    --num-nodes=${NUM_NODES} \
    --network=${VPC_NAME} \
    --subnetwork=${SUBNET_NAME} \
    --cluster-secondary-range-name=gke-pods \
    --services-secondary-range-name=gke-services \
    --enable-ip-alias \
    --enable-private-nodes \
    --master-ipv4-cidr=${MASTER_CIDR} \
    --enable-master-authorized-networks \
    --enable-dataplane-v2 \
    --gateway-api=standard \
    --workload-pool=${PROJECT_ID}.svc.id.goog \
    --enable-shielded-nodes \
    --enable-autorepair \
    --enable-autoupgrade \
    --release-channel=regular \
    --logging=SYSTEM,WORKLOAD \
    --monitoring=SYSTEM
```

> [!TIP]
> The cluster creation typically takes between 4 to 7 minutes. During this time, GCP provisions the managed control plane, allocates IP ranges, launches Compute Engine instances in the private subnet, and configures eBPF Datapath v2 agents (`anetd` / Cilium).

---

## 4. Key Flag Explanations

| Flag | Description |
| :--- | :--- |
| `--enable-private-nodes` | Prevents public IP assignment to node VM network interfaces. Nodes can only communicate with the VPC or via Cloud NAT. |
| `--enable-master-authorized-networks` | Restricts access to the Kubernetes API server endpoint to pre-approved CIDR ranges (such as Cloud Shell, corporate VPNs, or bastion subnets). |
| `--master-ipv4-cidr=172.16.0.0/28` | Allocates a dedicated `/28` range for the GKE managed control plane VPC peering connection. Must not overlap with any VPC CIDR. |
| `--enable-dataplane-v2` | Activates Cilium and eBPF in kernel space, replacing `kube-proxy` and iptables. |
| `--gateway-api=standard` | Enables native Kubernetes Gateway API CRDs (`gateway.networking.k8s.io`) and activates the GKE Gateway Controller. |
| `--workload-pool=${PROJECT_ID}.svc.id.goog` | Enables Workload Identity Federation for credential-less GCP API access from Pods. |

---

## 5. Verify Cluster Status

Once the cluster creation command finishes, verify its status:

```bash
gcloud container clusters list \
    --filter="name=${CLUSTER_NAME}" \
    --format="table(name, status, currentNodeCount, endpoint, privateClusterConfig.privateEndpoint)"
```

**Expected Output:**
```
NAME                STATUS   CURRENT_NODE_COUNT  ENDPOINT        PRIVATE_ENDPOINT
gke-enterprise-lab  RUNNING  3                   34.x.x.x        172.16.0.2
```

> [!TIP]
> **Terminal Table Formatting & Screen Reader Mode**:
> - If `gcloud` prints vertical `KEY: VALUE` lists instead of horizontal tables even with `list`, your terminal or Cloud Shell may have screen reader accessibility mode active. You can force standard tabular rendering with:
>   ```bash
>   gcloud config set accessibility/screen_reader false
>   ```
> - Additionally, `gcloud ... list` formats items as a horizontal table, whereas `gcloud ... describe` on a single resource defaults to vertical `KEY: VALUE` pairs unless projected. Both outputs confirm the cluster is healthy and running.

Inspect Datapath v2 and Gateway API status:
```bash
gcloud container clusters describe ${CLUSTER_NAME} \
    --zone=${ZONE} \
    --format="yaml(networkConfig.datapathProvider, gatewayConfig)"
```

**Expected Output:**
```yaml
gatewayConfig:
  enabled: true
networkConfig:
  datapathProvider: ADVANCED_DATAPATH
```

> [!NOTE]
> `ADVANCED_DATAPATH` indicates that Datapath v2 (eBPF) is active.

---

## ⏭️ Next Step
Proceed to [**Step 3: Bastion & Cluster Access**](03-access-and-bastion.md) to set up authorized network access and authenticate your `kubectl` client.

