import { useEffect, useState, type ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ShieldCheck, CheckCircle2, Clock4, XCircle, Upload } from 'lucide-react';
import { api, type GcscCompliance, type GcscRequiredDocument, type GcscUser } from '../../services/api';
import { complianceStatusCopy, formatFileSize } from './format';

export function CompliancePanel({ user }: { user: GcscUser }) {
  const [compliance, setCompliance] = useState<GcscCompliance | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState('');
  const [status, setStatus] = useState('');
  const isContractor = user.role === 'contractor';

  const loadCompliance = async () => {
    setLoading(true);
    try {
      const response = await api.getCompliance();
      setCompliance(response);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not load compliance status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompliance();
  }, [user.id]);

  const uploadDocument = async (document: GcscRequiredDocument, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 1500000) {
      setStatus('Document file is too large. Please use a PDF or image under 1.5MB.');
      return;
    }

    setUploadingType(document.document_type);
    setStatus('');
    try {
      const fileDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Could not read selected file'));
        reader.readAsDataURL(file);
      });
      const response = await api.submitDocument({
        documentType: document.document_type,
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
        fileDataUrl,
      });
      setCompliance(response.compliance);
      setStatus(`${document.label} submitted for review.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not submit document');
    } finally {
      setUploadingType('');
    }
  };

  const summary = complianceStatusCopy[compliance?.overall_status || 'profile_incomplete'];
  const requiredDocuments = compliance?.required_documents || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="space-y-6"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider gradient-text">Contractor Verification</p>
        <h2 className="font-outfit font-bold text-[1.5rem] gradient-text mt-1">Compliance Checklist</h2>
        <p className="font-inter text-sm text-[#475569] mt-1">
          Upload real contractor documents for profile review before bids become trust-ready.
        </p>
      </div>

      <div className="glass-card p-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[#64748B]">
            <Loader2 size={16} className="animate-spin" />
            Loading compliance status...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-6">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7B2FF7] via-[#3B6BF7] to-[#00D4FF] flex items-center justify-center mb-4">
                <ShieldCheck size={26} className="text-white" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#7B2FF7]">Verification status</p>
              <h3 className="font-outfit font-bold text-[1.75rem] gradient-text mt-1">
                {summary?.label || 'Profile incomplete'}
              </h3>
              <p className="text-sm text-[#475569] mt-3 leading-6">
                {isContractor
                  ? 'Profile data, required documents, and WebAuth wallet connection are checked together.'
                  : 'Owner accounts currently use profile and wallet checks. Contractor document review is not required for owners.'}
              </p>
              {compliance && (
                <div className="mt-5 h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${compliance.profile_completion.percent}%`,
                      background: 'linear-gradient(135deg, #7B2FF7 0%, #3B6BF7 55%, #00D4FF 100%)',
                    }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-3">
              {(compliance?.checklist || []).map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {item.completed ? <CheckCircle2 size={18} className="text-[#10B981] shrink-0" /> : <Clock4 size={18} className="text-[#F59E0B] shrink-0" />}
                    <span className="text-sm font-semibold text-[#0F172A] truncate">{item.label}</span>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: item.completed ? '#10B981' : '#F59E0B' }}>
                    {item.completed ? 'done' : (item.status || 'needed')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isContractor && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="font-outfit font-bold text-[1.25rem] gradient-text">Required Documents</h3>
              <p className="text-sm text-[#64748B] mt-1">PDF, PNG, JPG, or WEBP under 1.5MB per document.</p>
            </div>
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
              style={{ color: summary?.tone || '#7B2FF7', backgroundColor: 'rgba(123,47,247,0.08)' }}
            >
              {summary?.label || 'Review'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {requiredDocuments.map((document) => {
              const isUploading = uploadingType === document.document_type;
              const uploaded = document.document;
              return (
                <div key={document.document_type} className="rounded-xl border border-[#E2E8F0] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-outfit font-bold text-[#0F172A]">{document.label}</p>
                      <p className="text-xs text-[#64748B] mt-1">
                        {uploaded ? `${uploaded.file_name} - ${formatFileSize(uploaded.file_size)}` : 'No file submitted'}
                      </p>
                    </div>
                    {document.status === 'approved' ? (
                      <CheckCircle2 size={18} className="text-[#10B981] shrink-0" />
                    ) : document.status === 'rejected' ? (
                      <XCircle size={18} className="text-[#EF4444] shrink-0" />
                    ) : (
                      <Clock4 size={18} className="text-[#F59E0B] shrink-0" />
                    )}
                  </div>
                  {uploaded?.file_sha256 && (
                    <p className="mt-3 text-[0.7rem] text-[#94A3B8] break-all">SHA-256: {uploaded.file_sha256.slice(0, 18)}...</p>
                  )}
                  {uploaded?.review_note && (
                    <p className="mt-3 text-xs text-[#64748B]">{uploaded.review_note}</p>
                  )}
                  <label className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#C4B5FD] px-4 py-2 text-sm font-semibold text-[#7B2FF7] cursor-pointer hover:bg-[rgba(123,47,247,0.06)] transition-colors">
                    {isUploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                    {uploaded ? 'Replace file' : 'Upload file'}
                    <input
                      type="file"
                      accept="application/pdf,image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(event) => uploadDocument(document, event)}
                      disabled={isUploading}
                    />
                  </label>
                </div>
              );
            })}
          </div>
          {status && <p className={`text-sm mt-4 ${status.includes('submitted') ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>{status}</p>}
        </div>
      )}
    </motion.div>
  );
}
