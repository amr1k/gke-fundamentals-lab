# Step 2: Internal TCP/UDP Load Balancing

In enterprise architectures, backend Kubernetes workloads must often be reachable by non-Kubernetes clients residing within the same VPC (such as legacy Compute Engine VMs, Cloud Run services connected via Serverless VPC Access, or on-premises servers over Cloud Interconnect/VPN).

Google Cloud **Internal TCP/UDP Passthrough Load Balancers (L4 ILB)** provide private, high-performance, regional Layer 4 load balancing with zero proxy overhead.

---

## 1. How GKE Provisions an Internal Load Balancer

When you create a Kubernetes Service of `type: LoadBalancer` with the annotation `cloud.google.com/load-balancer-type: "Internal"`, the GKE Ingress/Service controller:
1. Allocates an internal RFC 1918 private IP address from your node subnet (`10.10.0.0/20`).
2. Creates a Google Cloud Regional Forwarding Rule, Backend Service, and Health Check.
3. Automatically programs firewall rules to allow Google Cloud health check probes (`130.211.0.0/22`, `35.191.0.0/16`).

---

## 2. Deploying the Internal Load Balancer

Apply the manifest located at `manifests/03-services/internal-lb.yaml`:

```bash
kubectl apply -f manifests/03-services/internal-lb.yaml
```

Check the status of the Service:

```bash
kubectl get svc internal-l4-service -n services-lab -w
```

Within 1-2 minutes, the `EXTERNAL-IP` column will be populated with a private IP address:

```
NAME                  TYPE           CLUSTER-IP     EXTERNAL-IP   PORT(S)        AGE
internal-l4-service   LoadBalancer   10.30.12.80    10.10.0.15    80:31920/TCP   90s
```

> [!NOTE]
> Even though Kubernetes calls the column `EXTERNAL-IP`, the assigned address (`10.10.0.15`) is purely internal to your VPC.

---

## 3. Inspecting the Google Cloud Infrastructure

Inspect the GCP Forwarding Rule provisioned by GKE:

```bash
gcloud compute forwarding-rules list \
    --project=${PROJECT_ID} \
    --regions=${REGION} \
    --filter="loadBalancingScheme=INTERNAL"
```

**Expected Output:**
```
NAME                             REGION       IP_ADDRESS   IP_PROTOCOL  TARGET
a893427812984124...              us-central1  10.10.0.15   TCP          ...
```

Inspect the Backend Service:
```bash
gcloud compute backend-services list \
    --project=${PROJECT_ID} \
    --regions=${REGION} \
    --filter="loadBalancingScheme=INTERNAL"
```

---

## 4. Testing Connectivity

From inside the VPC (e.g. from the bastion host created in Module 1, or another VM in the VPC):

```bash
ILB_IP=$(kubectl get svc internal-l4-service -n services-lab -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

curl http://${ILB_IP}
```

You will receive an HTTP response from the backing Pods.

---

## 5. Enterprise Feature: Global Access

By default, an internal L4 load balancer is accessible only from clients in the **same region** (`us-central1`).
By adding:
```yaml
metadata:
  annotations:
    networking.gke.io/internal-load-balancer-allow-global-access: "true"
```
clients from *any* GCP region connected to your VPC (and on-premises networks across Cloud Interconnect) can route traffic to this internal load balancer without requiring a cross-region proxy.

---

## ⏭️ Next Step
Proceed to [**Step 3: Container-Native Load Balancing (NEGs)**](03-negs-container-native.md) to eliminate double-hop node routing and enable direct pod health checking.

