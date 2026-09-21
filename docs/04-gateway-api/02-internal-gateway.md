# Step 2: Deploying Internal Application Gateway (`gke-l7-rilb`)

In this step, you will provision an **Internal Application Load Balancer Gateway** using the `gke-l7-rilb` GatewayClass. This creates managed Envoy proxies inside the proxy-only subnet configured in Module 1.

---

## 1. Deploy the Gateway & Applications

Apply the Gateway and sample applications:

```bash
kubectl apply -f manifests/04-gateway-api/internal-gateway.yaml
kubectl apply -f manifests/04-gateway-api/store-apps.yaml
```

Wait for application pods to be running:

```bash
kubectl rollout status deployment/store-v1 -n store-apps
kubectl rollout status deployment/billing-v1 -n store-apps
```

---

## 2. Inspect Gateway Status & Address Allocation

It takes approximately 1 to 3 minutes for Google Cloud to provision the Envoy proxies, forwarding rules, and internal IP.

Watch the Gateway resource:

```bash
kubectl get gateway internal-gateway -n gateway-infra -w
```

**Expected Output:**
```
NAME               CLASS         ADDRESS       PROGRAMMED   AGE
internal-gateway   gke-l7-rilb   10.10.0.25    True         2m
```

When `PROGRAMMED` is `True`, the Gateway is fully provisioned. The `ADDRESS` column displays the private internal IP allocated from `gke-nodes-subnet`.

---

## 3. Deep-Dive: Inspect Gateway Conditions

Inspect the detailed Kubernetes conditions reported by the GKE Gateway Controller:

```bash
kubectl describe gateway internal-gateway -n gateway-infra
```

Look for the `Status.Conditions` block:

```yaml
Status:
  Addresses:
    Type:   IPAddress
    Value:  10.10.0.25
  Conditions:
    Last Transition Time:  2026-09-21T...
    Message:               The Gateway has been programmed onto the infrastructure.
    Reason:                Programmed
    Status:                True
    Type:                  Programmed
    Last Transition Time:  2026-09-21T...
    Message:               The Gateway is ready to serve traffic.
    Reason:                Accepted
    Status:                True
    Type:                  Accepted
  Listeners:
    Attached Routes:  0
    Conditions:
      Last Transition Time:  2026-09-21T...
      Message:               Listener is ready
      Reason:                Programmed
      Status:                True
      Type:                  Programmed
    Name:                    http
    Port:                    80
    Protocol:                HTTP
```

Notice:
- `Attached Routes: 0`: The Gateway is listening on Port 80, but no routing rules (`HTTPRoute`) have been attached yet.

---

## 4. Inspecting Google Cloud Load Balancing Components

Let's verify what the GKE Gateway controller created in Google Cloud under the hood:

### 4.1 Forwarding Rule
```bash
gcloud compute forwarding-rules list \
    --project=${PROJECT_ID} \
    --regions=${REGION} \
    --filter="loadBalancingScheme=INTERNAL_MANAGED"
```

### 4.2 Regional URL Map
```bash
gcloud compute url-maps list \
    --project=${PROJECT_ID} \
    --regions=${REGION}
```

Notice that the `loadBalancingScheme` is `INTERNAL_MANAGED`. This signifies that Google Cloud is using **Envoy proxies** running inside our `10.40.0.0/24` proxy-only subnet to route requests to Pods.

---

## ⏭️ Next Step
Proceed to [**Step 3: Advanced Routing, Rewrites & TLS**](03-routing-and-tls.md) to attach HTTPRoutes to this Gateway.

