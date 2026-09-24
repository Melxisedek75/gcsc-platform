export function isWalletProbeLink(value: string | null, enabled: boolean): boolean;
export function inspectProofResponse(result: unknown): {
  signatureType: string; signatureCount: number; serializedBytes: number;
  format: string; broadcastResult: boolean;
};
