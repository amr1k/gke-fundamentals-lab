# Resource Teardown & Cleanup Guide

To prevent recurring Google Cloud billing charges after completing the hands-on lab, follow this systematic teardown procedure.

> [!CAUTION]
> The order of operations is critical. Always delete Kubernetes Gateway and Service resources **before** destroying the GKE cluster. This ensures that the GKE controller properly cleans up Google Cloud Forwarding Rules, Target Proxies, URL Maps, and Network Endpoint Groups. If the cluster is deleted first, orphaned cloud load balancers may prevent the VPC and subnets from being deleted.

---

## 1. Delete Kubernetes Applications & Gateway Resources

Delete all namespaces created during the lab:

```bash
kubectl delete namespace traffic-lab store-apps services-lab fundamentals-lab gateway-infra --ignore-not-found=true
```

Wait 60 to 90 seconds for Google Cloud to automatically deprovision the regional Envoy proxies, forwarding rules, and NEGs:

```bash
echo "Waiting for GCP Load Balancing components to release..."
sleep 60
```

Verify that all forwarding rules have been deleted:
```bash
gcloud compute forwarding-rules list \
    --project=${PROJECT_ID} \
    --regions=${REGION}
```

---

## 2. Delete the GKE Cluster

Delete the private GKE cluster:

```bash
gcloud container clusters delete ${CLUSTER_NAME} \
    --zone=${ZONE} \
    --project=${PROJECT_ID} \
    --quiet
```

---

## 3. Delete Bastion Host (if created)

```bash
gcloud compute instances delete gke-bastion \
    --zone=${ZONE} \
    --project=${PROJECT_ID} \
    --quiet
```

---

## 4. Delete Cloud NAT & Cloud Router

```bash
# Delete Cloud NAT
gcloud compute routers nats delete ${NAT_NAME} \
    --router=${ROUTER_NAME} \
    --region=${REGION} \
    --project=${PROJECT_ID} \
    --quiet

# Delete Cloud Router
gcloud compute routers delete ${ROUTER_NAME} \
    --region=${REGION} \
    --project=${PROJECT_ID} \
    --quiet
```

---

## 5. Delete Firewall Rules

```bash
gcloud compute firewall-rules delete \
    ${VPC_NAME}-allow-internal \
    ${VPC_NAME}-allow-health-checks \
    ${VPC_NAME}-allow-iap \
    --project=${PROJECT_ID} \
    --quiet
```

---

## 6. Delete Subnets & VPC Network

```bash
# Delete Proxy-Only Subnet
gcloud compute networks subnets delete ${PROXY_SUBNET_NAME} \
    --region=${REGION} \
    --project=${PROJECT_ID} \
    --quiet

# Delete Primary Nodes Subnet
gcloud compute networks subnets delete ${SUBNET_NAME} \
    --region=${REGION} \
    --project=${PROJECT_ID} \
    --quiet

# Delete Custom VPC Network
gcloud compute networks delete ${VPC_NAME} \
    --project=${PROJECT_ID} \
    --quiet
```

---

## 7. Verification

Confirm that all lab infrastructure has been completely destroyed:

```bash
gcloud compute networks list --project=${PROJECT_ID} --filter="name ~ ${VPC_NAME}"
```

If the command returns empty, your environment is 100% clean and no continuing charges will be incurred.

