#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const out = {
    baseUrl: process.env.HOSTINGER_API_BASE_URL || 'https://developers.hostinger.com',
    token: process.env.HOSTINGER_API_TOKEN || '',
    output: '',
    includeCatalog: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--base-url') out.baseUrl = argv[++i] ?? out.baseUrl;
    else if (token === '--token') out.token = argv[++i] ?? out.token;
    else if (token === '--output') out.output = argv[++i] ?? out.output;
    else if (token === '--include-catalog') out.includeCatalog = true;
  }

  return out;
}

function pickCollection(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.results)) return payload.results;

  // Some APIs wrap resources in object keys
  for (const value of Object.values(payload)) {
    if (Array.isArray(value)) return value;
  }

  return [];
}

async function getJson(url, token) {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/json',
      'content-type': 'application/json',
      'user-agent': 'polysniper-hostinger-discovery/1.0',
    },
  });

  const raw = await res.text();
  let json;
  try {
    json = raw ? JSON.parse(raw) : {};
  } catch {
    json = { raw };
  }

  return {
    ok: res.ok,
    status: res.status,
    url,
    body: json,
  };
}

function renderSummary(report) {
  const lines = [];
  lines.push('Hostinger VPS Discovery Summary');
  lines.push(`timestamp: ${report.timestampUtc}`);
  lines.push(`baseUrl: ${report.baseUrl}`);
  lines.push('');

  const dc = report.dataCenters;
  lines.push(`dataCenters: ${dc.length}`);
  if (dc.length) {
    lines.push('id | name | city | location | continent');
    lines.push('-- | ---- | ---- | -------- | ---------');
    for (const item of dc) {
      lines.push(
        `${String(item.id ?? '')} | ${String(item.name ?? '')} | ${String(item.city ?? '')} | ${String(
          item.location ?? '',
        )} | ${String(item.continent ?? '')}`,
      );
    }
    lines.push('');
  }

  const templates = report.templates;
  lines.push(`templates: ${templates.length}`);
  if (templates.length) {
    lines.push('templateId | name');
    lines.push('---------- | ----');
    for (const item of templates.slice(0, 20)) {
      lines.push(`${String(item.id ?? '')} | ${String(item.name ?? '')}`);
    }
    if (templates.length > 20) lines.push(`... (${templates.length - 20} more)`);
    lines.push('');
  }

  lines.push(`virtualMachines: ${report.virtualMachines.length}`);
  lines.push(`catalogItems(VPS-filtered): ${report.catalogItems.length}`);

  return lines.join('\n');
}

async function run() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.token) {
    throw new Error('missing_hostinger_api_token: set HOSTINGER_API_TOKEN or --token');
  }

  const base = args.baseUrl.replace(/\/$/, '');

  const [dataCentersResp, templatesResp, virtualMachinesResp] = await Promise.all([
    getJson(`${base}/api/vps/v1/data-centers`, args.token),
    getJson(`${base}/api/vps/v1/templates`, args.token),
    getJson(`${base}/api/vps/v1/virtual-machines`, args.token),
  ]);

  let catalogResp = null;
  if (args.includeCatalog) {
    catalogResp = await getJson(`${base}/api/billing/v1/catalog`, args.token);
  }

  const report = {
    timestampUtc: new Date().toISOString(),
    baseUrl: base,
    endpoints: {
      dataCenters: {
        status: dataCentersResp.status,
        ok: dataCentersResp.ok,
      },
      templates: {
        status: templatesResp.status,
        ok: templatesResp.ok,
      },
      virtualMachines: {
        status: virtualMachinesResp.status,
        ok: virtualMachinesResp.ok,
      },
      catalog: catalogResp
        ? {
            status: catalogResp.status,
            ok: catalogResp.ok,
          }
        : null,
    },
    dataCenters: pickCollection(dataCentersResp.body),
    templates: pickCollection(templatesResp.body),
    virtualMachines: pickCollection(virtualMachinesResp.body),
    catalogItems: catalogResp
      ? pickCollection(catalogResp.body).filter(
          (item) =>
            String(item?.category || '').toUpperCase() === 'VPS' ||
            /vps|kvm/i.test(String(item?.id || '')) ||
            /vps|kvm/i.test(String(item?.name || '')),
        )
      : [],
    raw: {
      dataCenters: dataCentersResp.body,
      templates: templatesResp.body,
      virtualMachines: virtualMachinesResp.body,
      catalog: catalogResp ? catalogResp.body : null,
    },
  };

  console.log(renderSummary(report));

  if (args.output) {
    fs.mkdirSync(path.dirname(args.output), { recursive: true });
    fs.writeFileSync(args.output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(`\nWrote: ${args.output}`);
  }

  if (!dataCentersResp.ok || !templatesResp.ok || !virtualMachinesResp.ok) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('hostinger_discovery_failed', error instanceof Error ? error.message : error);
  process.exit(1);
});
