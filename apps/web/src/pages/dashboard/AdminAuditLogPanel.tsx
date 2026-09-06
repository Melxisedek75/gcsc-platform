import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Activity } from 'lucide-react';
import { api, type GcscAuditEvent } from '../../services/api';
import { auditActionLabels, metadataSummary, formatDate } from './format';

export function AdminAuditLogPanel() {
  const [events, setEvents] = useState<GcscAuditEvent[]>([]);
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getAdminAuditEvents({ action, limit: 100 });
      setEvents(response.events || []);
      setStatus('');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not load audit events');
    } finally {
      setLoading(false);
    }
  }, [action]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filters = [
    { value: '', label: 'All' },
    { value: 'profile.updated', label: 'Profile' },
    { value: 'document.submitted', label: 'Submitted' },
    { value: 'document.reviewed', label: 'Reviewed' },
    { value: 'wallet.connected', label: 'Wallet' },
    { value: 'project.created', label: 'Projects' },
    { value: 'bid.submitted', label: 'Submitted Bids' },
    { value: 'bid.accepted', label: 'Accepted Bids' },
    { value: 'escrow.milestone.created', label: 'Milestone Created' },
    { value: 'escrow.milestone.submitted', label: 'Milestone Submitted' },
    { value: 'escrow.milestone.approved', label: 'Milestone Approved' },
    { value: 'escrow.milestone.released', label: 'Milestone Released' },
    { value: 'escrow.milestone.disputed', label: 'Milestone Disputed' },
    { value: 'escrow.chain_tx.recorded', label: 'Chain Tx Recorded' },
    { value: 'escrow.chain_tx.confirmed', label: 'Chain Tx Confirmed' },
    { value: 'escrow.chain_tx.failed', label: 'Chain Tx Failed' },
    { value: 'financing.precheck.created', label: 'Financing' },
    { value: 'payment.intent.created', label: 'Payments' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider gradient-text">Trust Events</p>
          <h2 className="font-outfit font-bold text-[1.5rem] gradient-text mt-1">Audit Log</h2>
          <p className="font-inter text-sm text-[#475569] mt-1">
            Review profile, document, wallet, project, bid, escrow, chain transaction, financing, and payment events recorded by the backend.
          </p>
        </div>
        <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-[#E2E8F0] bg-white p-1">
          {filters.map((item) => {
            const isActive = action === item.value;
            return (
              <button
                key={item.value || 'all'}
                onClick={() => setAction(item.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  backgroundColor: isActive ? 'rgba(123,47,247,0.1)' : 'transparent',
                  color: isActive ? '#7B2FF7' : '#64748B',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="glass-card p-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[#64748B]">
            <Loader2 size={16} className="animate-spin" />
            Loading audit events...
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-10">
            <Activity size={30} className="mx-auto text-[#94A3B8]" />
            <p className="mt-3 font-outfit font-bold gradient-text">No audit events found</p>
            <p className="text-sm text-[#64748B] mt-1">Switch filters or wait for trust events to be recorded.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(123,47,247,0.08)] px-3 py-1 text-xs font-semibold text-[#7B2FF7]">
                        <Activity size={13} />
                        {auditActionLabels[event.action] || event.action}
                      </span>
                      <span className="text-xs text-[#94A3B8]">
                        {event.created_at ? formatDate(event.created_at) : 'Time unknown'}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-[#475569] break-words">{metadataSummary(event)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-[#64748B] md:min-w-[220px]">
                    <span>Actor: {event.actor_id ?? '-'}</span>
                    <span>Target: {event.target_user_id ?? '-'}</span>
                    <span>Entity: {event.entity_type || '-'}</span>
                    <span>ID: {event.entity_id ?? '-'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {status && <p className="text-sm mt-4 text-[#EF4444]">{status}</p>}
      </div>
    </motion.div>
  );
}
