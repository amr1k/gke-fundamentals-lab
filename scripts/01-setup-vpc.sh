#!/usr/bin/env bash
# ==============================================================================
# Script: 01-setup-vpc.sh
# Purpose: Provision Enterprise Custom VPC, Subnets, Proxy Subnet, Router & NAT
# ==============================================================================
set -euo pipefail

# Configuration Defaults (override by setting env vars before running)
export PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project)}"
export REGION="${REGION:-us-central1}"
export ZONE="${ZONE:-us-central1-a}"
export VPC_NAME="${VPC_NAME:-gke-enterprise-vpc}"
export SUBNET_NAME="${SUBNET_NAME:-gke-nodes-subnet}"
export PROXY_SUBNET_NAME="${PROXY_SUBNET_NAME:-gke-proxy-subnet}"
export ROUTER_NAME="${ROUTER_NAME:-gke-router}"
export NAT_NAME="${NAT_NAME:-gke-nat}"

export NODES_CIDR="${NODES_CIDR:-10.10.0.0/20}"
export PODS_CIDR="${PODS_CIDR:-10.20.0.0/16}"
export SERVICES_CIDR="${SERVICES_CIDR:-10.30.0.0/20}"
export PROXY_CIDR="${PROXY_CIDR:-10.40.0.0/24}"

echo "============================================================"
echo " Starting Enterprise VPC Provisioning"
echo " Project:   ${PROJECT_ID}"
echo " Region:    ${REGION}"
echo " VPC Name:  ${VPC_NAME}"
echo "============================================================"

# 1. Create Custom VPC
if ! gcloud compute networks describe "${VPC_NAME}" --project="${PROJECT_ID}" &>/dev/null; then
    echo "Creating custom VPC network: ${VPC_NAME}..."
    gcloud compute networks create "${VPC_NAME}" \
        --project="${PROJECT_ID}" \
        --subnet-mode=custom \
        --bgp-routing-mode=regional
else
    echo "VPC network ${VPC_NAME} already exists. Skipping."
fi

# 2. Create Nodes Subnet with Secondary Ranges
if ! gcloud compute networks subnets describe "${SUBNET_NAME}" --region="${REGION}" --project="${PROJECT_ID}" &>/dev/null; then
    echo "Creating Subnet: ${SUBNET_NAME} with secondary ranges..."
    gcloud compute networks subnets create "${SUBNET_NAME}" \
        --project="${PROJECT_ID}" \
        --network="${VPC_NAME}" \
        --region="${REGION}" \
        --range="${NODES_CIDR}" \
        --secondary-range="gke-pods=${PODS_CIDR},gke-services=${SERVICES_CIDR}" \
        --enable-private-ip-google-access
else
    echo "Subnet ${SUBNET_NAME} already exists. Skipping."
fi

# 3. Create Regional Proxy-Only Subnet (for Gateway API / Envoy)
if ! gcloud compute networks subnets describe "${PROXY_SUBNET_NAME}" --region="${REGION}" --project="${PROJECT_ID}" &>/dev/null; then
    echo "Creating Proxy-Only Subnet: ${PROXY_SUBNET_NAME}..."
    gcloud compute networks subnets create "${PROXY_SUBNET_NAME}" \
        --project="${PROJECT_ID}" \
        --purpose=REGIONAL_MANAGED_PROXY \
        --role=ACTIVE \
        --region="${REGION}" \
        --network="${VPC_NAME}" \
        --range="${PROXY_CIDR}"
else
    echo "Proxy Subnet ${PROXY_SUBNET_NAME} already exists. Skipping."
fi

# 4. Create Cloud Router
if ! gcloud compute routers describe "${ROUTER_NAME}" --region="${REGION}" --project="${PROJECT_ID}" &>/dev/null; then
    echo "Creating Cloud Router: ${ROUTER_NAME}..."
    gcloud compute routers create "${ROUTER_NAME}" \
        --project="${PROJECT_ID}" \
        --network="${VPC_NAME}" \
        --region="${REGION}"
else
    echo "Cloud Router ${ROUTER_NAME} already exists. Skipping."
fi

# 5. Create Cloud NAT
if ! gcloud compute routers nats describe "${NAT_NAME}" --router="${ROUTER_NAME}" --region="${REGION}" --project="${PROJECT_ID}" &>/dev/null; then
    echo "Creating Cloud NAT: ${NAT_NAME}..."
    gcloud compute routers nats create "${NAT_NAME}" \
        --project="${PROJECT_ID}" \
        --router="${ROUTER_NAME}" \
        --region="${REGION}" \
        --auto-allocate-nat-external-ips \
        --nat-all-subnet-ip-ranges \
        --enable-logging
else
    echo "Cloud NAT ${NAT_NAME} already exists. Skipping."
fi

# 6. Create Firewall Rules
echo "Configuring Firewall Rules..."
if ! gcloud compute firewall-rules describe "${VPC_NAME}-allow-internal" --project="${PROJECT_ID}" &>/dev/null; then
    gcloud compute firewall-rules create "${VPC_NAME}-allow-internal" \
        --project="${PROJECT_ID}" \
        --network="${VPC_NAME}" \
        --allow=tcp,udp,icmp \
        --source-ranges=10.0.0.0/8 \
        --description="Allow internal VPC traffic"
fi

if ! gcloud compute firewall-rules describe "${VPC_NAME}-allow-health-checks" --project="${PROJECT_ID}" &>/dev/null; then
    gcloud compute firewall-rules create "${VPC_NAME}-allow-health-checks" \
        --project="${PROJECT_ID}" \
        --network="${VPC_NAME}" \
        --allow=tcp \
        --source-ranges=130.211.0.0/22,35.191.0.0/16 \
        --description="Allow Google Cloud health checks"
fi

if ! gcloud compute firewall-rules describe "${VPC_NAME}-allow-iap" --project="${PROJECT_ID}" &>/dev/null; then
    gcloud compute firewall-rules create "${VPC_NAME}-allow-iap" \
        --project="${PROJECT_ID}" \
        --network="${VPC_NAME}" \
        --allow=tcp:22 \
        --source-ranges=35.235.240.0/20 \
        --description="Allow IAP SSH tunnel"
fi

echo "============================================================"
echo " VPC Network Provisioning Complete!"
echo " Next step: Run 'bash scripts/02-create-cluster.sh'"
echo "============================================================"

