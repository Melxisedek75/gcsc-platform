import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Loader2, PlugZap } from 'lucide-react';
import { type GcscUser } from '../../services/api';
import { bindWebAuthWallet } from '../../services/walletBinding';
import { LockIcon } from './shared';

export function WalletPanel({ user, onUserChange }: { user: GcscUser; onUserChange: (user: GcscUser) => void }) {
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState('');
  const wallet = user.wallet || null;
  const binding = useRef<AbortController | null>(null);
  useEffect(() => () => { binding.current?.abort(); }, [user.id]);

  const connectWallet = async () => {
    if (binding.current) return;
    const controller = new AbortController();
    binding.current = controller;
    setConnecting(true);
    setStatus('');
    try {
      const updated = await bindWebAuthWallet(user.id, controller.signal);
      if (controller.signal.aborted) return;
      onUserChange(updated);
      setStatus('WebAuth wallet connected.');
    } catch (err) {
      if (controller.signal.aborted) return;
      setStatus(err instanceof Error ? err.message : 'Could not connect WebAuth wallet');
    } finally {
      if (binding.current === controller) binding.current = null;
      if (!controller.signal.aborted) setConnecting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="space-y-6"
    >
      <div>
        <h2 className="font-outfit font-bold text-[1.5rem] gradient-text">WebAuth Wallet</h2>
        <p className="font-inter text-sm text-[#475569] mt-1">Connect your decentralized XPR Network wallet to this account.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 md:col-span-2">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7B2FF7] to-[#00D4FF] flex items-center justify-center shrink-0">
              <Wallet size={24} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-outfit font-bold text-[1.25rem] gradient-text">
                {wallet ? wallet.accountName : 'Connect WebAuth Wallet'}
              </h3>
              <p className="text-sm text-[#475569] mt-1">
                {wallet
                  ? `Permission: ${wallet.permission}. ${wallet.verified ? 'Ownership verified for your GCSC profile.' : 'Ownership verification is required. Connect to verify this wallet.'}`
                  : 'Use WebAuth to authorize your XPR account. The site stores only your account name and permission, not private keys.'}
              </p>
              {status && <p className={`text-sm mt-3 ${status.includes('connected') ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>{status}</p>}
              <button
                onClick={connectWallet}
                disabled={connecting}
                className="mt-5 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-white font-inter font-semibold text-sm transition-all disabled:opacity-60 hover:scale-[1.04]"
                style={{ background: 'linear-gradient(135deg, #7B2FF7 0%, #3B6BF7 55%, #00D4FF 100%)' }}
              >
                {connecting ? <Loader2 size={16} className="animate-spin" /> : <PlugZap size={16} />}
                {wallet ? 'Reconnect WebAuth' : 'Connect WebAuth'}
              </button>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <LockIcon />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#475569]">Private keys</span>
          </div>
          <p className="font-outfit font-bold text-[1.75rem] gradient-text">Never stored</p>
          <p className="text-xs text-[#94A3B8] mt-1">WebAuth signs in its own wallet flow.</p>
        </div>
      </div>
    </motion.div>
  );
}
