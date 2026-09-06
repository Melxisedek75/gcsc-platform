import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ClipboardList } from 'lucide-react';
import { api, type GcscBid, type GcscUser } from '../../services/api';
import { formatCurrency, formatDate, bidStatusLabel } from './format';
import { StatusBadge } from './shared';

export function BidsPanel({ user }: { user: GcscUser }) {
  const [filter, setFilter] = useState<string>('All');
  const [bids, setBids] = useState<GcscBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isContractor = user.role === 'contractor';

  const loadBids = useCallback(async () => {
    if (!isContractor) {
      setBids([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await api.getMyBids();
      setBids(response.bids || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load bids');
    } finally {
      setLoading(false);
    }
  }, [isContractor]);

  useEffect(() => {
    void loadBids();
  }, [loadBids]);

  const filtered = useMemo(() => {
    if (filter === 'All') return bids;
    return bids.filter((bid) => bidStatusLabel(bid.status) === filter);
  }, [filter, bids]);

  if (!isContractor) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="space-y-6"
      >
        <div>
          <h2 className="font-outfit font-bold text-[1.5rem] text-[#0F172A]">Bids</h2>
          <p className="font-inter text-sm text-[#475569] mt-1">
            Homeowner bids are managed inside each project detail panel.
          </p>
        </div>
        <div className="glass-card p-8 text-center text-[#64748B]">
          <ClipboardList size={34} className="mx-auto text-[#94A3B8] mb-3" />
          <p className="font-semibold text-[#0F172A]">Open My Projects to review contractor bids.</p>
          <p className="text-sm mt-1">Accepting a bid creates the escrow record through the backend.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-outfit font-bold text-[1.5rem] text-[#0F172A]">My Bids</h2>
          <p className="font-inter text-sm text-[#475569] mt-1">
            Track contractor proposals submitted through the real API.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {(['All', 'Submitted', 'Accepted', 'Declined'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className="px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200"
            style={{
              backgroundColor: filter === status ? '#7B2FF7' : '#F1F5F9',
              color: filter === status ? '#FFFFFF' : '#475569',
            }}
          >
            {status}
          </button>
        ))}
        <div className="ml-auto text-sm text-[#475569]">
          {filtered.length} bid{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {error && <div className="glass-card p-4 text-sm text-[#EF4444]">{error}</div>}

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <th className="text-left px-4 py-3 font-semibold text-[#0F172A] text-xs uppercase tracking-wider">Bid ID</th>
                <th className="text-left px-4 py-3 font-semibold text-[#0F172A] text-xs uppercase tracking-wider">Project</th>
                <th className="text-left px-4 py-3 font-semibold text-[#0F172A] text-xs uppercase tracking-wider">Bid Amount</th>
                <th className="text-left px-4 py-3 font-semibold text-[#0F172A] text-xs uppercase tracking-wider">Timeline</th>
                <th className="text-left px-4 py-3 font-semibold text-[#0F172A] text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-[#0F172A] text-xs uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[#64748B]">
                    <Loader2 size={18} className="animate-spin inline mr-2" /> Loading bids...
                  </td>
                </tr>
              ) : filtered.map((bid) => {
                const label = bidStatusLabel(bid.status);
                return (
                  <tr key={bid.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]/60 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[#3B6BF7] font-medium">#{bid.id}</td>
                    <td className="px-4 py-3 font-medium text-[#0F172A]">Project #{bid.project_id}</td>
                    <td className="px-4 py-3 font-semibold text-[#0F172A]">{formatCurrency(bid.amount)}</td>
                    <td className="px-4 py-3 text-[#475569]">{bid.proposed_timeline_days || 30} days</td>
                    <td className="px-4 py-3"><StatusBadge status={label} /></td>
                    <td className="px-4 py-3 text-[#475569]">{formatDate(bid.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 text-[#94A3B8]">
            No bids match your filter. Open Projects and submit your first proposal.
          </div>
        )}
      </div>
    </motion.div>
  );
}
