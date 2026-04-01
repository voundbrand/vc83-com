# Security & Sandboxing Guide

How to run PolySniper in a properly isolated environment on macOS.

## Step 1: Create a Dedicated macOS User

```bash
# Create the user (run as admin)
sudo dscl . -create /Users/polysniper
sudo dscl . -create /Users/polysniper UserShell /bin/zsh
sudo dscl . -create /Users/polysniper RealName "PolySniper Bot"
sudo dscl . -create /Users/polysniper UniqueID 550
sudo dscl . -create /Users/polysniper PrimaryGroupID 20
sudo dscl . -create /Users/polysniper NFSHomeDirectory /Users/polysniper
sudo dscl . -passwd /Users/polysniper <STRONG_PASSWORD>
sudo createhomedir -c -u polysniper

# Verify
dscl . -read /Users/polysniper
```

This gives you filesystem isolation, a separate Keychain, and clean process separation. If the bot gets compromised, the attacker is stuck in this user account.

## Step 2: Set Up the Dedicated User Environment

```bash
# Switch to the bot user
su - polysniper

# Install Homebrew (under the bot user)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Docker
brew install --cask docker

# Install Python (if not using Docker)
brew install python@3.12

# Clone PolySniper
cd ~
# Copy the polysniper folder here
```

## Step 3: Financial Isolation

1. **Open a separate bank account** (or use a prepaid card service like Privacy.com)
2. **Fund a prepaid debit card** with your trading budget ($500-2,000 to start)
3. **Create a new MetaMask wallet** — NEVER use your main wallet
4. **Bridge USDC to Polygon** using the prepaid card as the funding source
5. **Set a hard limit**: never keep more than 30 days of trading capital on-chain
6. **Weekly sweeps**: move profits to a hardware wallet (Ledger/Trezor)

## Step 4: Dedicated API Accounts

Create separate accounts using a dedicated email (e.g., polysniper-bot@protonmail.com):

1. **Anthropic** — create at console.anthropic.com
   - Set a monthly spend limit ($100-200 to start)
   - Create a dedicated API key just for PolySniper
   - This is your kill switch: if the bot goes haywire, revoke this key

2. **Chainstack** — create at chainstack.com
   - Free tier gives you a Polygon RPC endpoint
   - Dedicated to this bot only

3. **OpenRouter** (optional) — for cheaper hedge scans
   - create at openrouter.ai
   - Set a spend limit

## Step 5: Docker Sandboxing

```bash
# As the polysniper user:
cd ~/polysniper

# Configure
cp .env.example .env
chmod 600 .env
nano .env  # Fill in your keys

# Build and run
docker compose build
docker compose run sniper s12  # Test with paper mode first
```

The Docker setup provides:
- **Read-only filesystem** (except /app/data)
- **Non-root user** inside the container
- **Resource limits** (2 CPU, 2GB RAM max)
- **No privilege escalation** (no-new-privileges)
- **tmpfs /tmp** (nothing persists to disk except /app/data)

## Step 6: Network Firewall

The bot should ONLY be able to reach:
- `api.anthropic.com` (Opus 4.6)
- `gamma-api.polymarket.com` (market data)
- `clob.polymarket.com` (trading)
- Your Chainstack RPC endpoint

### Option A: macOS Application Firewall + Little Snitch

Install [Little Snitch](https://www.obdev.at/products/littlesnitch/) and create rules:
- Allow Docker to connect to the 4 endpoints above
- Block everything else for the polysniper user

### Option B: iptables (Linux / Docker host)

```bash
sudo bash firewall.sh
```

This resolves the IPs for each allowed hostname and blocks all other outbound HTTPS from Docker containers.

### Option C: Docker Network Policy (Advanced)

Use a Docker network plugin or Calico to enforce egress policies at the container level.

## Step 7: Monitoring & Alerts

### Log Monitoring
All trades are logged to `data/logs/polysniper.jsonl` in JSON format. Set up a cron job to alert you:

```bash
# Alert if daily volume exceeds threshold
*/30 * * * * grep "$(date +\%Y-\%m-\%d)" ~/polysniper/data/logs/polysniper.jsonl | \
  grep '"trade"' | wc -l | xargs -I{} test {} -gt 50 && \
  echo "PolySniper: >50 trades today" | mail -s "Alert" your@email.com
```

### API Spend Monitoring
Check your Anthropic dashboard weekly. Set up billing alerts at console.anthropic.com.

### Wallet Balance Monitoring
Check your Polygon wallet balance daily. If it drops below your stop-loss threshold, revoke the API key and investigate.

## Emergency Kill Switch

If anything looks wrong:

1. **Revoke the Anthropic API key** at console.anthropic.com (stops all Opus 4.6 calls)
2. **Stop the Docker container**: `docker compose down`
3. **Move funds out of the trading wallet** to your hardware wallet
4. **Review logs**: `cat data/logs/polysniper.jsonl | tail -100`

## What This Protects Against

| Threat | Mitigation |
|--------|-----------|
| Private key theft via compromised dependency | Docker isolation + dedicated wallet with limited funds |
| Runaway API costs | Anthropic spend limits + per-key caps |
| Bot makes catastrophically bad trades | Risk manager hard limits + paper mode default |
| Network exfiltration | Firewall restricts to 4 approved endpoints only |
| Compromise of main macOS account | Dedicated user account — blast radius contained |
| Malicious skill/package injection | No OpenClaw dependency — you control all code |
| Exchange/wallet hack | Prepaid card + separate bank account + weekly sweeps |
