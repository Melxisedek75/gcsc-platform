export function isWalletProbeLink(value, enabled) {
  if (!enabled || typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'smartcontractor:' && url.hostname === 'wallet-probe'
      && ['', '/'].includes(url.pathname) && !url.username && !url.password && !url.port;
  } catch { return false; }
}

export function inspectProofResponse(result) {
  const signatures = Array.isArray(result?.signatures) ? result.signatures : [];
  const prefix = signatures.length ? String(signatures[0]).match(/^SIG_(K1|R1|WA)_/)?.[1] : null;
  const bytes = result?.resolved?.serializedTransaction ?? result?.serializedTransaction;
  const serializedBytes = bytes instanceof Uint8Array ? bytes.length
    : typeof bytes === 'string' && /^(?:[a-f0-9]{2})+$/i.test(bytes) ? bytes.length / 2 : 0;
  return {
    signatureType: prefix ?? 'unknown', signatureCount: Math.min(signatures.length, 100),
    serializedBytes: Math.min(serializedBytes, 1000000),
    format: result?.resolved?.serializedTransaction != null ? 'native-resolved'
      : result?.serializedTransaction != null ? 'serialized' : 'unknown',
    broadcastResult: result?.processed != null || result?.transaction_id != null,
  };
}
