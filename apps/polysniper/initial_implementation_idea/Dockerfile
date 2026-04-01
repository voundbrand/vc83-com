FROM python:3.12-slim

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r sniper && useradd -r -g sniper -d /app -s /bin/bash sniper

# Install Python deps
COPY pyproject.toml .
RUN pip install --no-cache-dir . 2>/dev/null || true
# Fallback: install deps directly
RUN pip install --no-cache-dir \
    anthropic>=0.42.0 \
    py-clob-client>=0.18.0 \
    web3>=7.0.0 \
    requests>=2.31.0 \
    click>=8.1.0 \
    python-dotenv>=1.0.0 \
    rich>=13.0.0 \
    schedule>=1.2.0

# Copy source
COPY . .

# Create data directories
RUN mkdir -p /app/data/logs /app/data && chown -R sniper:sniper /app

# Run as non-root
USER sniper

ENTRYPOINT ["python", "-m", "polysniper.cli"]
CMD ["--help"]
