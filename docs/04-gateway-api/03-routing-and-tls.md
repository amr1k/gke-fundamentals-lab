# Step 3: Advanced Routing, Rewrites & TLS

In this step, you will attach an `HTTPRoute` to the `internal-gateway`, configure path matching, request header modifications, HTTP redirects, and explore TLS termination.

---

## 1. Deploy the HTTPRoute & ReferenceGrant

Apply the HTTPRoute and ReferenceGrant manifests:

```bash
kubectl apply -f manifests/04-gateway-api/cross-namespace-referencegrant.yaml
kubectl apply -f manifests/04-gateway-api/path-routing.yaml
```

Check the status of the HTTPRoute:

```bash
kubectl get httproute store-routes -n store-apps
```

Verify that the route is accepted by the Gateway:

```bash
kubectl describe httproute store-routes -n store-apps
```

Look for `Status.Parents`:
```yaml
Status:
  Parents:
    Conditions:
      Last Transition Time:  2026-09-21T...
      Message:               Route was accepted
      Reason:                Accepted
      Status:                True
      Type:                  Accepted
    Controller Name:         networking.gke.io/gateway
    Parent Ref:
      Group:                 gateway.networking.k8s.io
      Kind:                  Gateway
      Name:                  internal-gateway
      Namespace:             gateway-infra
      Section Name:          http
```

---

## 2. Testing HTTP Routing Scenarios

Obtain the internal Gateway IP address:

```bash
GATEWAY_IP=$(kubectl get gateway internal-gateway -n gateway-infra -o jsonpath='{.status.addresses[0].value}')
echo "Gateway Internal IP is: ${GATEWAY_IP}"
```

Because this is an internal load balancer inside our private VPC, we test from an internal pod or bastion VM. Let's run a test curl from `dnsutils` pod:

### 2.1 Test Path Routing: `/store`
```bash
kubectl exec -n fundamentals-lab -it dnsutils -- curl -s \
    -H "Host: store.enterprise.internal" \
    http://${GATEWAY_IP}/store
```

**Expected Result:**
The echoserver response will show:
- Request served by `store-v1` pod.
- Request header: `x-corporate-env: production` (injected automatically by the Gateway filter!).

### 2.2 Test Path Routing: `/billing`
```bash
kubectl exec -n fundamentals-lab -it dnsutils -- curl -s \
    -H "Host: store.enterprise.internal" \
    http://${GATEWAY_IP}/billing
```

**Expected Result:**
Request is routed to the `billing-v1` pod.

### 2.3 Test HTTP Redirect: `/legacy-shop` -> `/store`
```bash
kubectl exec -n fundamentals-lab -it dnsutils -- curl -s -I \
    -H "Host: store.enterprise.internal" \
    http://${GATEWAY_IP}/legacy-shop
```

**Expected Output:**
```http
HTTP/1.1 301 Moved Permanently
location: /store
content-length: 0
date: Mon, 21 Sep 2026 ...
```

---

## 3. Securing with TLS Termination

In enterprise environments, internal traffic is encrypted with TLS (HTTPS).

### 3.1 Generate a Self-Signed TLS Secret (or use corporate CA)
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /tmp/tls.key -out /tmp/tls.crt \
    -subj "/CN=store.enterprise.internal/O=Enterprise"

kubectl create secret tls store-tls-cert \
    --cert=/tmp/tls.crt \
    --key=/tmp/tls.key \
    -n gateway-infra
```

### 3.2 Add an HTTPS Listener to the Gateway
To enable TLS, add a 443 listener to `Gateway`:

```yaml
spec:
  listeners:
  - name: https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - name: store-tls-cert
    allowedRoutes:
      namespaces:
        from: All
```

The Google Cloud Internal Application Load Balancer terminates the TLS session at the Envoy proxy layer and communicates with Pods over high-speed VPC private networks.

---

## ⏭️ Next Step
Proceed to [**Module 5: Advanced Deployment Strategies**](../05-deployment-strategies/index.md) to implement Canary, A/B Testing, Blue/Green cutover, and Traffic Mirroring using Gateway API.

