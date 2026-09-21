# Step 1: Datapath v2 Network Policies

In this step, you will implement a **Zero-Trust Network Model** inside the cluster using Kubernetes `NetworkPolicy` objects evaluated in the Linux kernel via Datapath v2 (eBPF).

---

## 1. The Zero-Trust Progression

1. **Step 1: Baseline Default-Deny**: Cut off all unauthorized inbound and outbound traffic in the target namespace.
2. **Step 2: Allow Essential Infrastructure**: Permit DNS resolution to `kube-system` DNS servers.
3. **Step 3: Allow Proxy Ingress**: Permit traffic from Google Cloud's Regional Proxy Subnet (`10.40.0.0/24`) to frontend services.
4. **Step 4: Pod Microsegmentation**: Restrict database pods so they exclusively accept TCP traffic from frontend API pods.

---

## 2. Apply Default-Deny

Apply the default-deny policy in the `services-lab` namespace:

```bash
kubectl apply -f manifests/06-security/default-deny.yaml
```

### Test Isolation Immediately:
Attempt to curl the database or web service from `dnsutils`:

```bash
kubectl exec -n fundamentals-lab -it dnsutils -- curl --connect-timeout 3 \
  http://web-api-clusterip.services-lab.svc.cluster.local
```

**Expected Result:**
```
curl: (28) Failed to connect to ... Connection timed out
```
The packet is immediately dropped in kernel space by eBPF before reaching the container network stack!

---

## 3. Apply Microsegmentation Policies

Now apply the granular rules that selectively authorize valid application communication paths:

```bash
kubectl apply -f manifests/06-security/microsegmentation.yaml
```

Inspect active network policies:

```bash
kubectl get networkpolicies -n services-lab
```

**Expected Output:**
```
NAME                    POD-SELECTOR        AGE
allow-db-only-from-api  app=stateful-db     25s
allow-dns-egress        <none>              25s
allow-web-api-traffic   app=web-api         25s
default-deny-all        <none>              2m
```

---

## 4. Hands-on Verification

### 4.1 Test 1: Verify API to DB Connectivity (ALLOWED)
Execute a connection from the `web-api` pod to the database on port 5432:

```bash
API_POD=$(kubectl get pods -n services-lab -l app=web-api -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n services-lab -it ${API_POD} -- /bin/sh -c \
  "curl -s --connect-timeout 3 http://database-headless:5432 || nc -zv database-headless 5432"
```

**Result:** Connection succeeds because `allow-db-only-from-api` explicitly permits traffic from pods labeled `app: web-api`.

### 4.2 Test 2: Unauthorized Pod to DB (BLOCKED)
Attempt to reach the database from `dnsutils` (unauthorized):

```bash
kubectl exec -n fundamentals-lab -it dnsutils -- nc -zv -w 3 \
  database-headless.services-lab.svc.cluster.local 5432
```

**Result:** Connection times out and is blocked by eBPF.

### 4.3 Test 3: Gateway Envoy to API Pod (ALLOWED)
Test the HTTP endpoint through the Gateway:

```bash
GATEWAY_IP=$(kubectl get gateway internal-gateway -n gateway-infra -o jsonpath='{.status.addresses[0].value}')

kubectl exec -n fundamentals-lab -it dnsutils -- curl -s \
  -H "Host: store.enterprise.internal" \
  http://${GATEWAY_IP}/store
```

**Result:** Success, because `allow-web-api-traffic` allows ingress from the proxy-only subnet `10.40.0.0/24`.

---

## ⏭️ Next Step
Proceed to [**Step 2: FQDN Egress Policies**](02-fqdn-egress.md) to restrict outbound internet traffic by domain name.

