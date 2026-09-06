import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api, type GcscFinancingPrecheck } from '../../services/api';
import { financingProductLabel } from './format';

export function AdminFinancingPrechecksPanel() {
  const [prechecks, setPrechecks] = useState<GcscFinancingPrecheck[]>([]);
  const [statusFilter, setStatusFilter] = useState('demo_precheck');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  const loadPrechecks = useCallback(async () => {
    setLoading(true);
    setStatus('');
    try {
      const response = await api.getAdminFinancingPrechecks(statusFilter);
      setPrechecks(response.prechecks || []);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not load financing prechecks');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadPrechecks();
  }, [loadPrechecks]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="space-y-6"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#7B2FF7]">Financing Review</p>
        <h2 className="mt-2 font-outfit font-bold text-[1.75rem] gradient-text">Demo financing prechecks</h2>
        <p className="mt-2 max-w-[760px] text-sm leading-6 text-[#475569]">
          Review user interest in future financing workflows. These records are admin review signals only and do not create a loan offer, approval, token lock, insurance assignment, or repayment routing.
        </p>
      </div>

      <div className="glass-card p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-outfit font-bold text-[#0F172A]">Precheck filter</p>
            <p className="text-sm text-[#64748B]">Default view shows demo/MVP prechecks awaiting review.</p>
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#475569]"
          >
            <option value="demo_precheck">Demo precheck</option>
            <option value="">All statuses</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="glass-card p-8 text-center text-[#64748B]">Loading financing prechecks...</div>
      ) : prechecks.length === 0 ? (
        <div className="glass-card p-8 text-center text-[#64748B]">No financing prechecks found.</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {prechecks.map((precheck) => (
            <div key={precheck.id} className="glass-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#7B2FF7]">{precheck.status}</p>
                  <h3 className="mt-1 font-outfit font-bold text-[1.1rem] text-[#0F172A]">{financingProductLabel(precheck.product_type)}</h3>
                  <p className="mt-2 text-sm text-[#64748B]">
                    {precheck.user?.full_name || 'Unknown user'} · {precheck.user?.companyName || precheck.user?.businessName || precheck.user?.role || precheck.role}
                  </p>
                </div>
                <span className="rounded-full bg-[#EFF6FF] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#1E3A8A]">
                  {precheck.state || 'No state'}
                </span>
              </div>
              <div className="mt-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Context</p>
                <p className="mt-2 text-sm leading-6 text-[#475569]">{JSON.stringify(precheck.context || {})}</p>
              </div>
              <p className="mt-4 text-xs leading-5 text-[#991B1B]">
                Admin/legal/provider review required before any real-money activation. This is not live lending.
              </p>
            </div>
          ))}
        </div>
      )}

      {status && <p className="text-sm text-[#EF4444]">{status}</p>}
    </motion.div>
  );
}
