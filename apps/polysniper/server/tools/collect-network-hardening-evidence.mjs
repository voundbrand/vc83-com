#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function usage() {
  console.error(
    [
      "Usage:",
      "  node apps/polysniper/server/tools/collect-network-hardening-evidence.mjs \\",
      "    --host <ip-or-host> \\",
      "    --output-dir <abs-or-rel-dir> \\",
      "    [--user root] \\",
      "    [--expected-open 22,443] \\",
      "",
      "Auth:",
      "  Set PSNP_SSH_PASSWORD for password auth, or PSNP_SSH_KEY_PATH for key auth.",
    ].join("\n")
  );
}

function parseArgs(argv) {
  const args = {
    host: "",
    user: "root",
    outputDir: "",
    expectedOpen: [22],
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--host" && next) {
      args.host = next;
      i += 1;
      continue;
    }
    if (arg === "--user" && next) {
      args.user = next;
      i += 1;
      continue;
    }
    if (arg === "--output-dir" && next) {
      args.outputDir = next;
      i += 1;
      continue;
    }
    if (arg === "--expected-open" && next) {
      args.expectedOpen = next
        .split(",")
        .map((x) => Number(x.trim()))
        .filter((x) => Number.isInteger(x) && x > 0);
      i += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  if (!args.host || !args.outputDir) {
    usage();
    throw new Error("Missing required arguments: --host and --output-dir");
  }
  return args;
}

function nowIso() {
  return new Date().toISOString();
}

function runProcess(cmd, args, env = process.env, timeoutMs = 20000) {
  const proc = spawnSync(cmd, args, {
    env,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
    timeout: timeoutMs,
  });
  return {
    command: [cmd, ...args].join(" "),
    exitCode: proc.status ?? 1,
    stdout: proc.stdout ?? "",
    stderr: proc.stderr ?? "",
  };
}

function runRemote(remoteCommand, cfg) {
  const sshBase = [
    "-o",
    "StrictHostKeyChecking=accept-new",
    "-o",
    "ConnectTimeout=10",
  ];

  const target = `${cfg.user}@${cfg.host}`;
  const password = process.env.PSNP_SSH_PASSWORD;
  const keyPath = process.env.PSNP_SSH_KEY_PATH;

  if (password) {
    return runProcess(
      "sshpass",
      [
        "-p",
        password,
        "ssh",
        ...sshBase,
        "-o",
        "PreferredAuthentications=password",
        "-o",
        "PubkeyAuthentication=no",
        target,
        remoteCommand,
      ],
      process.env
    );
  }

  if (keyPath) {
    return runProcess(
      "ssh",
      [
        "-i",
        keyPath,
        ...sshBase,
        "-o",
        "BatchMode=yes",
        target,
        remoteCommand,
      ],
      process.env
    );
  }

  throw new Error("Set PSNP_SSH_PASSWORD or PSNP_SSH_KEY_PATH before running");
}

function localPortProbe(host, port) {
  let out = runProcess("nc", ["-z", "-G", "3", host, String(port)], process.env, 8000);
  if (
    out.exitCode !== 0 &&
    (out.stderr.includes("illegal option") || out.stderr.includes("invalid option"))
  ) {
    out = runProcess("nc", ["-z", "-w", "3", host, String(port)], process.env, 8000);
  }
  return {
    port,
    status: out.exitCode === 0 ? "open" : "closed_or_filtered",
    exitCode: out.exitCode,
    stderr: out.stderr.trim(),
  };
}

function redactRawSecretLikeValues(text) {
  return text
    .replace(/(password\s*[:=]\s*)(\S+)/gi, "$1<REDACTED>")
    .replace(/(token\s*[:=]\s*)(\S+)/gi, "$1<REDACTED>")
    .replace(/(secret\s*[:=]\s*)(\S+)/gi, "$1<REDACTED>");
}

function shellQuoteSingle(text) {
  return `'${text.replace(/'/g, "'\"'\"'")}'`;
}

function main() {
  const cfg = parseArgs(process.argv.slice(2));
  const outputDir = resolve(cfg.outputDir);
  mkdirSync(outputDir, { recursive: true });

  const commands = [
    {
      id: "identity",
      cmd: "echo USER=$(whoami); echo HOST=$(hostname); date -u +%Y-%m-%dT%H:%M:%SZ",
    },
    {
      id: "os_release",
      cmd: "cat /etc/os-release || uname -a",
    },
    {
      id: "listening_sockets",
      cmd: "ss -tulpen 2>/dev/null || ss -tulpn",
    },
    {
      id: "ufw_status",
      cmd: "ufw status verbose 2>&1 || true",
    },
    {
      id: "nft_ruleset",
      cmd: "command -v nft >/dev/null && nft list ruleset 2>&1 || true",
    },
    {
      id: "iptables_s",
      cmd: "iptables -S 2>&1 || true",
    },
    {
      id: "iptables_lv",
      cmd: "iptables -L -n -v 2>&1 || true",
    },
    {
      id: "sshd_config_key_lines",
      cmd: "grep -E '^(PermitRootLogin|PasswordAuthentication|PubkeyAuthentication|ChallengeResponseAuthentication|UsePAM)' /etc/ssh/sshd_config 2>/dev/null || true",
    },
    {
      id: "ssh_service_state",
      cmd: "systemctl is-active ssh 2>/dev/null || systemctl is-active sshd 2>/dev/null || true",
    },
    {
      id: "ssh_service_enabled",
      cmd: "systemctl is-enabled ssh 2>/dev/null || systemctl is-enabled sshd 2>/dev/null || true",
    },
  ];

  const remoteResults = [];
  for (const item of commands) {
    const wrapped = `bash -lc ${shellQuoteSingle(item.cmd)}`;
    const result = runRemote(wrapped, cfg);
    remoteResults.push({
      id: item.id,
      remoteCommand: item.cmd,
      exitCode: result.exitCode,
      stdout: redactRawSecretLikeValues(result.stdout),
      stderr: redactRawSecretLikeValues(result.stderr),
    });
  }

  const uniqueProbePorts = Array.from(
    new Set([...cfg.expectedOpen, 22, 80, 443, 3000, 8080, 5432])
  ).sort((a, b) => a - b);
  const localProbe = uniqueProbePorts.map((port) => localPortProbe(cfg.host, port));

  const generatedAt = nowIso();
  const summary = {
    generatedAt,
    target: {
      host: cfg.host,
      user: cfg.user,
      authMode: process.env.PSNP_SSH_PASSWORD ? "password" : "ssh_key",
      expectedOpenPorts: cfg.expectedOpen,
    },
    remoteResults,
    localProbe,
  };

  const jsonPath = resolve(outputDir, "NETWORK_HARDENING_EVIDENCE.json");
  writeFileSync(jsonPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  const openFromProbe = localProbe
    .filter((p) => p.status === "open")
    .map((p) => p.port)
    .sort((a, b) => a - b);
  const unexpectedOpen = openFromProbe.filter((p) => !cfg.expectedOpen.includes(p));
  const missingExpected = cfg.expectedOpen.filter((p) => !openFromProbe.includes(p));

  const md = [
    "# Network Hardening Evidence",
    "",
    `- Generated at: \`${generatedAt}\``,
    `- Target host: \`${cfg.host}\``,
    `- Target user: \`${cfg.user}\``,
    `- Auth mode used: \`${summary.target.authMode}\``,
    `- Expected open ports: \`${cfg.expectedOpen.join(", ")}\``,
    "",
    "## Local Reachability Probe",
    "",
    `- Open from probe: \`${openFromProbe.join(", ") || "none"}\``,
    `- Unexpected open: \`${unexpectedOpen.join(", ") || "none"}\``,
    `- Missing expected: \`${missingExpected.join(", ") || "none"}\``,
    "",
    "## Remote Command Snapshot",
    "",
    ...remoteResults.map((r) => `- ${r.id}: exit=\`${r.exitCode}\``),
    "",
    "See `NETWORK_HARDENING_EVIDENCE.json` for full command output.",
    "",
  ].join("\n");

  const mdPath = resolve(outputDir, "NETWORK_HARDENING_EVIDENCE.md");
  writeFileSync(mdPath, md, "utf8");

  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
