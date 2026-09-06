import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ShieldCheck, Building2, CheckCircle2, XCircle } from 'lucide-react';
import { api, type GcscUserDocument } from '../../services/api';
import { complianceStatusCopy, documentTypeLabel, formatDate, formatFileSize } from './format';

type DocumentReviewFilter = '' | 'submitted' | 'approved' | 'rejected';

export function AdminDocumentReviewPanel() {
  const [documents, setDocuments] = useState<GcscUserDocument[]>([]);
  const [filter, setFilter] = useState<DocumentReviewFilter>('submitted');
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
  const [status, setStatus] = useState('');

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getAdminDocuments(filter);
      setDocuments(response.documents || []);
      setStatus('');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not load submitted documents');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const reviewDocument = async (document: GcscUserDocument, reviewStatus: 'approved' | 'rejected') => {
    const manualNote = (reviewNotes[document.id] || '').trim();
    if (reviewStatus === 'rejected' && !manualNote) {
      setStatus('Manual note required when rejecting a document.');
      return;
    }

    setReviewingId(document.id);
    setStatus('');
    try {
      await api.reviewDocument(document.id, {
        status: reviewStatus,
        reviewNote: manualNote || 'Approved by admin review.',
      });
      await loadDocuments();
      setReviewNotes((current) => ({ ...current, [document.id]: '' }));
      setStatus(`${documentTypeLabel(document.document_type)} ${reviewStatus}.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not save document review');
    } finally {
      setReviewingId(null);
    }
  };

  const filters: { value: DocumentReviewFilter; label: string }[] = [
    { value: 'submitted', label: 'Submitted' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: '', label: 'All' },
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
          <p className="text-xs font-semibold uppercase tracking-wider gradient-text">Admin Review</p>
          <h2 className="font-outfit font-bold text-[1.5rem] gradient-text mt-1">Submitted Documents</h2>
          <p className="font-inter text-sm text-[#475569] mt-1">
            Review contractor verification files before homeowners can rely on verified bidding signals.
          </p>
        </div>
        <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-[#E2E8F0] bg-white p-1">
          {filters.map((item) => {
            const isActive = filter === item.value;
            return (
              <button
                key={item.label}
                onClick={() => setFilter(item.value)}
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
            Loading submitted documents...
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-10">
            <ShieldCheck size={30} className="mx-auto text-[#94A3B8]" />
            <p className="mt-3 font-outfit font-bold gradient-text">No documents in this queue</p>
            <p className="text-sm text-[#64748B] mt-1">Switch filters or wait for contractors to submit verification files.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {documents.map((document) => {
              const owner = document.user;
              const ownerName = owner?.companyName || owner?.businessName || owner?.full_name || `User #${document.user_id}`;
              const isReviewing = reviewingId === document.id;
              const statusCopy = complianceStatusCopy[document.status] || { label: document.status, tone: '#7B2FF7' };

              return (
                <div key={document.id} className="rounded-2xl border border-[#E2E8F0] bg-white p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#7B2FF7] via-[#3B6BF7] to-[#00D4FF] flex items-center justify-center overflow-hidden shrink-0">
                        {owner?.logoDataUrl ? (
                          <img src={owner.logoDataUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Building2 size={20} className="text-white" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-outfit font-bold gradient-text truncate">{ownerName}</h3>
                        <p className="text-xs text-[#64748B] truncate">{owner?.email || 'Email unavailable'}</p>
                        <p className="text-xs text-[#94A3B8] truncate">{owner?.serviceArea || owner?.role || 'Contractor profile'}</p>
                      </div>
                    </div>
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider shrink-0"
                      style={{ color: statusCopy.tone, backgroundColor: 'rgba(123,47,247,0.08)' }}
                    >
                      {statusCopy.label}
                    </span>
                  </div>

                  <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#7B2FF7]">{documentTypeLabel(document.document_type)}</p>
                    <p className="mt-1 text-sm font-semibold text-[#0F172A] break-words">{document.file_name}</p>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#64748B]">
                      <span>Size: {formatFileSize(document.file_size)}</span>
                      <span>Submitted: {document.submitted_at ? formatDate(document.submitted_at) : 'Unknown'}</span>
                    </div>
                    {document.file_sha256 && (
                      <p className="mt-3 text-[0.7rem] text-[#94A3B8] break-all">SHA-256: {document.file_sha256}</p>
                    )}
                    {document.review_note && (
                      <p className="mt-3 text-xs text-[#64748B]">Review note: {document.review_note}</p>
                    )}
                  </div>

                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Admin review note</span>
                    <textarea
                      value={reviewNotes[document.id] || ''}
                      onChange={(event) => setReviewNotes((current) => ({ ...current, [document.id]: event.target.value }))}
                      placeholder="Add an approval note or rejection reason for the contractor."
                      maxLength={300}
                      rows={3}
                      className="mt-2 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition focus:border-[#7B2FF7] focus:ring-2 focus:ring-[#7B2FF7]/20"
                    />
                  </label>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => reviewDocument(document, 'approved')}
                      disabled={isReviewing || document.status === 'approved'}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #10B981 0%, #3B6BF7 100%)' }}
                    >
                      {isReviewing ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                      Approve
                    </button>
                    <button
                      onClick={() => reviewDocument(document, 'rejected')}
                      disabled={isReviewing || document.status === 'rejected'}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[#FCA5A5] px-4 py-2.5 text-sm font-semibold text-[#EF4444] transition-all disabled:opacity-50 hover:bg-[#FEF2F2]"
                    >
                      {isReviewing ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {status && <p className={`text-sm mt-4 ${status.includes('Could') || status.includes('Unauthorized') ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>{status}</p>}
      </div>
    </motion.div>
  );
}
