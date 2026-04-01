#!/bin/bash
# ============================================
# PolySniper Network Firewall Rules
# Run this on the Docker HOST to restrict
# container outbound traffic to approved IPs only.
#
# This prevents a compromised container from
# exfiltrating data or calling unauthorized APIs.
# ============================================

set -euo pipefail

echo "Resolving allowed hostnames..."

# Resolve current IPs for allowed services
ANTHROPIC_IPS=$(dig +short api.anthropic.com | grep -E '^[0-9]')
GAMMA_IPS=$(dig +short gamma-api.polymarket.com | grep -E '^[0-9]')
CLOB_IPS=$(dig +short clob.polymarket.com | grep -E '^[0-9]')
# Add your Chainstack RPC IP here:
# CHAINSTACK_IPS=$(dig +short polygon-mainnet.core.chainstack.com | grep -E '^[0-9]')

echo "Flushing existing DOCKER-USER rules..."
iptables -F DOCKER-USER 2>/dev/null || true

echo "Adding allowed destinations..."

# Allow DNS (needed for hostname resolution)
iptables -A DOCKER-USER -p udp --dport 53 -j ACCEPT
iptables -A DOCKER-USER -p tcp --dport 53 -j ACCEPT

# Allow Anthropic API
for ip in $ANTHROPIC_IPS; do
    iptables -A DOCKER-USER -d "$ip" -p tcp --dport 443 -j ACCEPT
    echo "  Allowed: api.anthropic.com ($ip)"
done

# Allow Polymarket Gamma API
for ip in $GAMMA_IPS; do
    iptables -A DOCKER-USER -d "$ip" -p tcp --dport 443 -j ACCEPT
    echo "  Allowed: gamma-api.polymarket.com ($ip)"
done

# Allow Polymarket CLOB
for ip in $CLOB_IPS; do
    iptables -A DOCKER-USER -d "$ip" -p tcp --dport 443 -j ACCEPT
    echo "  Allowed: clob.polymarket.com ($ip)"
done

# Block everything else from Docker containers
iptables -A DOCKER-USER -o eth0 -p tcp --dport 443 -j DROP
iptables -A DOCKER-USER -o eth0 -p tcp --dport 80 -j DROP

# Allow return traffic
iptables -A DOCKER-USER -j RETURN

echo ""
echo "Firewall rules applied. Docker containers can ONLY reach:"
echo "  - api.anthropic.com"
echo "  - gamma-api.polymarket.com"
echo "  - clob.polymarket.com"
echo ""
echo "To remove: iptables -F DOCKER-USER"
