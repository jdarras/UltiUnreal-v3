'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const { getDataDir } = require('./data-path.cjs');
const { listDetectedStations } = require('./server-hosts-online.cjs');
const { hostsToList } = require('./server-normalize.cjs');

const DEFAULT_AGENT_PORT = 4000;
const QUEUE_LENGTH_TIMEOUT_MS = 2000;
const SEND_JOB_TIMEOUT_MS = 5000;
const NOTIFY_STATUS_TIMEOUT_MS = 3000;

function getHostsServerFilePath() {
  return path.join(getDataDir(), 'hosts_server.json');
}

function getLogLineFn() {
  if (typeof globalThis !== 'undefined' && typeof globalThis.logLine === 'function') {
    return globalThis.logLine;
  }
  if (typeof global !== 'undefined' && typeof global.logLine === 'function') {
    return global.logLine;
  }
  return null;
}

function logWithFallback(entry = {}) {
  const payload = entry && typeof entry === 'object' ? entry : {};
  const logLine = getLogLineFn();
  if (logLine) {
    try {
      logLine(payload);
      return;
    } catch {}
  }
  const level = String(payload.level || 'error').trim().toLowerCase();
  const action = String(payload.action || '').trim();
  const message = String(payload.message || '').trim();
  const data = payload.data;
  const prefix = `[postprod-remote-dispatcher${action ? `/${action}` : ''}]`;
  if (level === 'info' || level === 'success' || level === 'debug') {
    if (data !== undefined) console.info(prefix, message, data);
    else console.info(prefix, message);
    return;
  }
  if (data !== undefined) console.error(prefix, message, data);
  else console.error(prefix, message);
}

function normalizeHostCandidate(value) {
  let hostRaw = String(value || '').trim();
  if (!hostRaw) return '';
  hostRaw = hostRaw.replace(/^\s*https?:\/\//i, '');
  const slashIndex = hostRaw.indexOf('/');
  if (slashIndex >= 0) {
    hostRaw = hostRaw.slice(0, slashIndex).trim();
  }
  if (!hostRaw) return '';
  if (hostRaw.startsWith('[')) {
    const end = hostRaw.indexOf(']');
    hostRaw = end > 1 ? hostRaw.slice(1, end).trim() : '';
  }
  if (!hostRaw) return '';
  if (/^localhost$/i.test(hostRaw)) return '127.0.0.1';
  if (/^[^:]+:\d+$/.test(hostRaw)) {
    hostRaw = String(hostRaw.split(':')[0] || '').trim();
  }
  return hostRaw;
}

function formatHostForHttpUrl(hostValue) {
  const host = normalizeHostCandidate(hostValue);
  if (!host) return '';
  if (host.includes(':') && !host.startsWith('[')) return `[${host}]`;
  return host;
}

function normalizePort(agentPort) {
  const n = Number(agentPort);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_AGENT_PORT;
  return Math.max(1, Math.min(65535, Math.trunc(n)));
}

function resolveLocalIpCandidates() {
  const out = new Set(['127.0.0.1']);
  try {
    const interfaces = os.networkInterfaces() || {};
    const allEntries = Object.values(interfaces);
    for (const entries of allEntries) {
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        const ip = normalizeHostCandidate(entry?.address || '');
        if (!ip) continue;
        out.add(ip);
      }
    }
  } catch {}
  return out;
}

function readKnownStations() {
  const hostsServerFile = getHostsServerFilePath();
  try {
    const rawText = fs.readFileSync(hostsServerFile, 'utf8');
    const parsed = JSON.parse(rawText || '{}');
    const hosts = hostsToList(parsed);
    return Array.isArray(hosts) ? hosts : [];
  } catch (error) {
    logWithFallback({
      level: 'error',
      src: 'postprod-remote-dispatcher',
      action: 'read_hosts_failed',
      message: 'Impossible de lire hosts_server.json',
      data: { error: String(error?.message || error || '').slice(0, 240), hostsServerFile },
    });
    return [];
  }
}

async function fetchJsonWithTimeout(url, { method = 'GET', body = undefined, timeoutMs = 2000 } = {}) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), Math.max(100, Math.trunc(timeoutMs))) : null;

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller ? controller.signal : undefined,
    });

    const text = await response.text();
    let json = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
    }
    return { ok: response.ok, status: response.status, json };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function selectBestStation(excludeIp, agentPort) {
  const excluded = normalizeHostCandidate(excludeIp);
  const port = normalizePort(agentPort);
  const hosts = readKnownStations();
  const detectedStations = typeof listDetectedStations === 'function'
    ? listDetectedStations()
    : [];
  const localIpCandidates = resolveLocalIpCandidates();
  if (excluded) localIpCandidates.add(excluded);

  const byIp = new Map();
  for (const host of [...hosts, ...detectedStations]) {
    const ip = normalizeHostCandidate(host?.ip || host?.address || '');
    if (!ip || localIpCandidates.has(ip)) continue;
    const candidate = {
      ip,
      stationName: String(host?.name || host?.stationName || ip).trim() || ip,
      agentPort: normalizePort(host?.agentPort || host?.port || port),
    };
    if (!byIp.has(ip)) {
      byIp.set(ip, candidate);
      continue;
    }
    const previous = byIp.get(ip);
    byIp.set(ip, {
      ...previous,
      stationName: previous.stationName || candidate.stationName,
      agentPort: previous.agentPort || candidate.agentPort,
    });
  }
  const candidates = [...byIp.values()];

  if (candidates.length <= 0) return null;

  const checks = candidates.map(async (candidate) => {
    const hostForUrl = formatHostForHttpUrl(candidate.ip);
    if (!hostForUrl) throw new Error('invalid_station_ip');
    const candidatePort = normalizePort(candidate.agentPort || port);
    const requestUrl = `http://${hostForUrl}:${candidatePort}/agent/postprod/remote/queue-length`;
    const res = await fetchJsonWithTimeout(requestUrl, { method: 'GET', timeoutMs: QUEUE_LENGTH_TIMEOUT_MS });
    if (!res.ok || !res.json || res.json.ok !== true) {
      const errMsg = String(res?.json?.error || `http_${Number(res?.status || 0)}`).trim();
      throw new Error(errMsg || 'queue_length_unavailable');
    }
    const queueRaw = Number(res.json.queueLength);
    const queueLength = Number.isFinite(queueRaw) ? Math.max(0, Math.trunc(queueRaw)) : 0;
    const isEditing = Boolean(res.json.isEditing);
    return {
      ip: candidate.ip,
      stationName: String(res.json.stationName || candidate.stationName || candidate.ip).trim() || candidate.ip,
      queueLength,
      isEditing,
    };
  });

  const settled = await Promise.allSettled(checks);
  const available = [];

  for (let i = 0; i < settled.length; i += 1) {
    const result = settled[i];
    const candidate = candidates[i];
    if (result?.status === 'fulfilled' && result.value) {
      available.push(result.value);
      continue;
    }
    logWithFallback({
      level: 'error',
      src: 'postprod-remote-dispatcher',
      action: 'queue_probe_failed',
      message: `Sonde file distante echouee pour ${candidate?.ip || 'unknown'}`,
      data: { error: String(result?.reason?.message || result?.reason || 'unknown_error').slice(0, 240) },
    });
  }

  if (available.length <= 0) return null;

  available.sort((a, b) => {
    if (a.queueLength !== b.queueLength) return a.queueLength - b.queueLength;
    const aEditing = a.isEditing ? 1 : 0;
    const bEditing = b.isEditing ? 1 : 0;
    if (aEditing !== bEditing) return aEditing - bEditing;
    return String(a.stationName || a.ip).localeCompare(String(b.stationName || b.ip), undefined, { sensitivity: 'base' });
  });

  const winner = available[0];
  return {
    ip: winner.ip,
    stationName: winner.stationName,
    queueLength: winner.queueLength,
  };
}

async function sendJobToStation(targetIp, agentPort, jobPayload) {
  const ip = normalizeHostCandidate(targetIp);
  const hostForUrl = formatHostForHttpUrl(ip);
  if (!hostForUrl) {
    return { ok: false, jobId: null, stationStatus: '', error: 'missing_target_ip' };
  }

  const port = normalizePort(agentPort);
  const requestUrl = `http://${hostForUrl}:${port}/agent/postprod/remote/receive-job`;

  try {
    const res = await fetchJsonWithTimeout(requestUrl, {
      method: 'POST',
      body: jobPayload && typeof jobPayload === 'object' ? jobPayload : {},
      timeoutMs: SEND_JOB_TIMEOUT_MS,
    });
    const responseJson = res.json && typeof res.json === 'object' ? res.json : {};
    const jobIdRaw = Number(responseJson.jobId);
    const jobId = Number.isFinite(jobIdRaw) && jobIdRaw > 0 ? Math.trunc(jobIdRaw) : null;
    const stationStatus = String(responseJson.stationStatus || '').trim();
    if (res.ok && responseJson.ok === true) {
      return { ok: true, jobId, stationStatus, error: '' };
    }
    return {
      ok: false,
      jobId,
      stationStatus,
      error: String(responseJson.error || `http_${Number(res.status || 0)}`).trim() || 'send_job_failed',
    };
  } catch (error) {
    logWithFallback({
      level: 'error',
      src: 'postprod-remote-dispatcher',
      action: 'send_job_failed',
      message: `Envoi job vers ${ip}:${port} impossible`,
      data: { error: String(error?.message || error || '').slice(0, 240) },
    });
    return { ok: false, jobId: null, stationStatus: '', error: String(error?.message || 'send_job_failed') };
  }
}

async function notifyJobStatusUpdate(originIp, agentPort, statusPayload) {
  const ip = normalizeHostCandidate(originIp);
  const hostForUrl = formatHostForHttpUrl(ip);
  if (!hostForUrl) return;

  const port = normalizePort(agentPort);
  const requestUrl = `http://${hostForUrl}:${port}/agent/postprod/remote/job-status-update`;

  try {
    await fetchJsonWithTimeout(requestUrl, {
      method: 'POST',
      body: statusPayload && typeof statusPayload === 'object' ? statusPayload : {},
      timeoutMs: NOTIFY_STATUS_TIMEOUT_MS,
    });
  } catch (error) {
    logWithFallback({
      level: 'error',
      src: 'postprod-remote-dispatcher',
      action: 'notify_status_failed',
      message: `Notification statut vers ${ip}:${port} echouee`,
      data: { error: String(error?.message || error || '').slice(0, 240) },
    });
  }
}

module.exports = {
  selectBestStation,
  sendJobToStation,
  notifyJobStatusUpdate,
};
