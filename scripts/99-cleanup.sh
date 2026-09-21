#!/usr/bin/env bash
# ==============================================================================
# Script: 99-cleanup.sh
# Purpose: Safe, ordered decommissioning of all lab infrastructure
# ==============================================================================
set -euo pipefail

export PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project)}"
export REGION="${REGION:-us-central1}"
export ZONE="${ZONE:-us-central1-a}"
export CLUSTER_NAME="${CLUSTER_NAME:-gke-enterprise-lab}"
export VPC_NAME="${VPC_NAME:-gke-enterprise-vpc}"
export SUBNET_NAME="${SUBNET_NAME:-gke-nodes-subnet}"
export PROXY_SUBNET_NAME="${PROXY_SUBNET_NAME:-gke-proxy-subnet}"
export ROUTER_NAME="${ROUTER_NAME:-gke-router}"
export NAT_NAME="${NAT_NAME:-gke-nat}"

echo "============================================================"
echo " CAUTION: TEARDOWN OF ALL GKE NETWORKING LAB RESOURCES"
echo " Project:   ${PROJECT_ID}"
echo " Cluster:   ${CLUSTER_NAME}"
echo " VPC:       ${VPC_NAME}"
echo "============================================================"

read -p "Are you sure you want to delete all resources? (y/N): " CONFIRM
if [[ "${CONFIRM}" != "y" && "${CONFIRM}" != "Y" ]]; then
    echo "Teardown aborted."
    exit 0
fi

# 1. Clean up Kubernetes workloads first
echo "Deleting Kubernetes namespaces and Gateway resources..."
kubectl delete namespace traffic-lab store-apps services-lab fundamentals-lab gateway-infra --ignore-not-found=true || true

echo "Waiting 60 seconds for GCP Load Balancers and NEGs to release..."
sleep 60

# 2. Delete GKE Cluster
if gcloud container clusters describe "${CLUSTER_NAME}" --zone="${ZONE}" --project="${PROJECT_ID}" &>/dev/null; then
    echo "Deleting GKE cluster: ${CLUSTER_NAME}..."
    gcloud container clusters delete "${CLUSTER_NAME}" --zone="${ZONE}" --project="${PROJECT_ID}" --quiet
else
    echo "Cluster ${CLUSTER_NAME} not found. Skipping."
fi

# 3. Delete Bastion if exists
if gcloud compute instances describe gke-bastion --zone="${ZONE}" --project="${PROJECT_ID}" &>/dev/null; then
    echo "Deleting bastion VM..."
    gcloud compute instances delete gke-bastion --zone="${ZONE}" --project="${PROJECT_ID}" --quiet
fi

# 4. Delete Cloud NAT & Router
if gcloud compute routers nats describe "${NAT_NAME}" --router="${ROUTER_NAME}" --region="${REGION}" --project="${PROJECT_ID}" &>/dev/null; then
    echo "Deleting Cloud NAT: ${NAT_NAME}..."
    gcloud compute routers nats delete "${NAT_NAME}" --router="${ROUTER_NAME}" --region="${REGION}" --project="${PROJECT_ID}" --quiet
fi

if gcloud compute routers describe "${ROUTER_NAME}" --region="${REGION}" --project="${PROJECT_ID}" &>/dev/null; then
    echo "Deleting Cloud Router: ${ROUTER_NAME}..."
    gcloud compute routers delete "${ROUTER_NAME}" --region="${REGION}" --project="${PROJECT_ID}" --quiet
fi

# 5. Delete Firewall Rules
echo "Deleting Firewall Rules..."
for FW in "${VPC_NAME}-allow-internal" "${VPC_NAME}-allow-health-checks" "${VPC_NAME}-allow-iap"; do
    if gcloud compute firewall-rules describe "${FW}" --project="${PROJECT_ID}" &>/dev/null; then
        gcloud compute firewall-rules delete "${FW}" --project="${PROJECT_ID}" --quiet
    fi
done

# 6. Delete Subnets & VPC
if gcloud compute networks subnets describe "${PROXY_SUBNET_NAME}" --region="${REGION}" --project="${PROJECT_ID}" &>/dev/null; then
    echo "Deleting Proxy Subnet: ${PROXY_SUBNET_NAME}..."
    gcloud compute networks subnets delete "${PROXY_SUBNET_NAME}" --region="${REGION}" --project="${PROJECT_ID}" --quiet
fi

if gcloud compute networks subnets describe "${SUBNET_NAME}" --region="${REGION}" --project="${PROJECT_ID}" &>/dev/null; then
    echo "Deleting Nodes Subnet: ${SUBNET_NAME}..."
    gcloud compute networks subnets delete "${SUBNET_NAME}" --region="${REGION}" --project="${PROJECT_ID}" --quiet
fi

if gcloud compute networks describe "${VPC_NAME}" --project="${PROJECT_ID}" &>/dev/null; then
    echo "Deleting Custom VPC: ${VPC_NAME}..."
    gcloud compute networks delete "${VPC_NAME}" --project="${PROJECT_ID}" --quiet
fi

echo "============================================================"
echo " TEARDOWN COMPLETE! All resources deleted successfully."
echo "============================================================"

