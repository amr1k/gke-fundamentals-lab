# Step 1: Diagnostics Guide & Production Runbook

This guide covers systematic troubleshooting procedures for GKE Networking issues.

---

## 1. Gateway API Diagnostics

When an HTTPRoute fails to route traffic or returns HTTP 404/503 errors, inspect the resource status hierarchy.

### 1.1 Inspect Gateway Conditions
```bash
kubectl get gateway -A
kubectl describe gateway <gateway-name> -n <namespace>
```

#### Common Condition Failures:
| Condition | Status | Root Cause & Resolution |
| :--- | :--- | :--- |
| `Programmed` | `False` | **Missing Proxy-Only Subnet**: Ensure you created the subnet with `--purpose=REGIONAL_MANAGED_PROXY` in the same region. |
| `Programmed` | `False` | **IP Address Exhaustion**: Check if the subnet CIDR or proxy subnet has exhausted free IP addresses. |
| `ListenersNotValid` | `True` | **Port or Protocol Conflict**: Multiple listeners bound to the same port without distinct hostnames. |

### 1.2 Inspect HTTPRoute Conditions
```bash
kubectl describe httproute <route-name> -n <namespace>
```

#### Key Conditions:
- **`Accepted: True`**: The Gateway accepted and bound this route.
  - If `False`: Check `parentRefs`. Verify that the target Gateway exists and that its listener's `allowedRoutes` permits routes from this namespace.
- **`ResolvedRefs: True`**: The backend services referenced in `backendRefs` were found and validated.
  - If `False` with `RefNotPermitted`: You are referencing a Service in another namespace without a valid `ReferenceGrant` in that target namespace.
  - If `False` with `BackendNotFound`: Typo in the Service name or port.

---

## 2. Network Endpoint Group (NEG) Diagnostics

In GKE, Layer 7 load balancers route traffic directly to Pod IPs via NEGs. If a NEG is not healthy, the load balancer returns `HTTP 502 Bad Gateway` or `HTTP 503 Service Unavailable`.

### 2.1 Check Service Annotation
Ensure your Service manifest includes the NEG annotation:
```yaml
metadata:
  annotations:
    cloud.google.com/neg: '{"exposed_ports": {"8080":{}}}'
```

Verify that GKE successfully provisioned the NEG:
```bash
kubectl get svc <service-name> -n <namespace> -o jsonpath='{.metadata.annotations.cloud\.google\.com/neg-status}' | jq .
```
If `neg-status` is missing, inspect the GKE NEG controller logs or Service events:
```bash
kubectl describe svc <service-name> -n <namespace>
```

### 2.2 Verify Health Check Status in GCP
Find the Backend Service associated with the Gateway/NEG and query its health:

```bash
# List backend services created by the Gateway
gcloud compute backend-services list \
    --project=${PROJECT_ID} \
    --regions=${REGION} \
    --filter="loadBalancingScheme=INTERNAL_MANAGED"

# Check endpoint health
gcloud compute backend-services get-health <backend-service-name> \
    --region=${REGION} \
    --project=${PROJECT_ID}
```

If health status is `UNHEALTHY`:
1. **Firewall Rule Missing**: Verify that Google Cloud health check IP ranges (`130.211.0.0/22`, `35.191.0.0/16`) are permitted in VPC firewall rules.
2. **Container Port Mismatch**: Verify that the Pod's container is actively listening on the exact port specified in the Service's `targetPort`.
3. **Application Readiness Probes**: If the Pod fails its Kubernetes `readinessProbe`, GKE will remove it from the NEG.

---

## 3. Datapath v2 (eBPF) Packet Drop Diagnostics

If connections are unexpectedly timing out or dropping:

### 3.1 Inspect `anetd` Logs
Find the `anetd` pod on the node hosting your workload:

```bash
NODE_NAME=$(kubectl get pod <pod-name> -n <namespace> -o jsonpath='{.spec.nodeName}')
ANETD_POD=$(kubectl get pods -n kube-system -l k8s-app=cilium --field-selector spec.nodeName=${NODE_NAME} -o jsonpath='{.items[0].metadata.name}')

kubectl logs -n kube-system ${ANETD_POD} -c cilium-agent --tail=50
```

### 3.2 Check for Policy Drops
To see if a `NetworkPolicy` is actively dropping packets:

```bash
kubectl logs -n kube-system ${ANETD_POD} -c cilium-agent | grep -i "Policy dropped"
```

---

## 4. On-Demand Network Diagnostic Toolkit

Launch an interactive diagnostic pod into any target namespace:

```bash
kubectl run net-toolbox --rm -it --restart=Never \
  -n <namespace> \
  --image=nicolaka/netshoot -- /bin/bash
```

The `netshoot` container includes:
- `dig` / `nslookup`: Test DNS resolution and search paths.
- `curl` / `httpie`: Test HTTP/S responses and header inspection.
- `nc` (netcat): Test raw TCP/UDP port connectivity.
- `tcpdump`: Capture raw packet traces.
- `mtr` / `traceroute`: Trace routing hops.

---

## 5. Google Cloud CLI Output & Screen Reader Mode

If `gcloud` commands that specify `--format="table(...)"` output flattened, vertical `KEY: VALUE` lists instead of horizontal tabular columns, `gcloud` has active screen reader accessibility mode enabled.

To restore standard horizontal table rendering across all `gcloud` output:

```bash
gcloud config set accessibility/screen_reader false
```

To check your current accessibility configuration:

```bash
gcloud config get-value accessibility/screen_reader
```


