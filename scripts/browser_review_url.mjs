const DEFAULT_PORTS = [3005, 3006, 3007, 3008, 3009, 3010, 4173];
const HEALTHCHECK_PATH = 'healthz';

function normalizeBaseUrl(value) {
  const url = new URL(value);
  return url.href.endsWith('/') ? url.href : `${url.href}/`;
}

function parsePorts(value) {
  return value
    .split(',')
    .map((port) => Number.parseInt(port.trim(), 10))
    .filter(Number.isInteger);
}

function getCandidateUrls() {
  const explicitPortList = process.env.BROWSER_REVIEW_PORTS?.trim();
  const ports = explicitPortList ? parsePorts(explicitPortList) : DEFAULT_PORTS;
  return ports.map((port) => `http://127.0.0.1:${port}/`);
}

async function probeReviewUrl(baseUrl) {
  const healthUrl = new URL(HEALTHCHECK_PATH, baseUrl);

  try {
    const response = await fetch(healthUrl, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(1500),
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    if (payload?.ok === true && 'mode' in payload && 'parserRootConfigured' in payload) {
      return normalizeBaseUrl(baseUrl);
    }
  } catch {
    return null;
  }

  return null;
}

export async function resolveBrowserReviewUrl() {
  const explicitUrl = process.env.BROWSER_REVIEW_URL?.trim();

  if (explicitUrl) {
    const resolvedUrl = await probeReviewUrl(explicitUrl);
    if (resolvedUrl) {
      return resolvedUrl;
    }

    throw new Error(
      `BROWSER_REVIEW_URL did not respond with a valid review studio healthcheck: ${explicitUrl}`,
    );
  }

  const candidateUrls = getCandidateUrls();
  for (const candidateUrl of candidateUrls) {
    const resolvedUrl = await probeReviewUrl(candidateUrl);
    if (resolvedUrl) {
      return resolvedUrl;
    }
  }

  throw new Error(
    `Unable to find a local review studio. Tried: ${candidateUrls.join(', ')}. ` +
      'Set BROWSER_REVIEW_URL to an active app URL if your server is using a different port.',
  );
}
