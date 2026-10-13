export function isWalletProbeLink(value: string | null, enabled: boolean): boolean;
export function inspectWalletLaunch(value: unknown, expectedScheme: unknown): {
  scheme: string; uriLength: number; transport: 'encoded-request' | 'session-link' | 'invalid';
};
export function inspectProofResponse(result: unknown): {
  signatureType: string; signatureCount: number; serializedBytes: number;
  format: string; broadcastResult: boolean;
};
