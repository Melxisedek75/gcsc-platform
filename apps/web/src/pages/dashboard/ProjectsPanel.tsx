import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import {
  Loader2,
  Save,
  Gavel,
  CheckCircle2,
  Search,
  SlidersHorizontal,
  Eye,
  Building2,
  UserCircle,
  ClipboardList,
  RefreshCw,
  MessageCircle,
  Send,
} from 'lucide-react';
import {
  api,
  ApiError,
  type GcscBid,
  type GcscEscrow,
  type GcscMilestone,
  type GcscProject,
  type GcscPaidProjectBrief,
  type GcscUser,
} from '../../services/api';
import { createLatestRequestGate } from '../../services/latest-request.mjs';
import { fieldClass, formatCurrency, projectStatusLabel, bidStatusLabel } from './format';
import { StatusBadge, ContractorTrustBadge } from './shared';
import { MilestoneManager } from './MilestoneManager';

const legacyEscrowWorkflowEnabled = import.meta.env.VITE_ENABLE_LEGACY_ESCROW_WORKFLOW === 'true';

function ProjectRequestForm({ onCreated }: { onCreated: (project: GcscProject) => void }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'General Remodel',
    budget_min: '',
    budget_max: '',
    location: '',
    timeline_days: '30',
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  const update = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setStatus('');
    try {
      const response = await api.createProject({
        title: form.title,
        description: form.description,
        category: form.category,
        budget_min: Number(form.budget_min || 0),
        budget_max: Number(form.budget_max || 0),
        location: form.location,
        timeline_days: Number(form.timeline_days || 30),
      });
      onCreated(response.project);
      setForm({
        title: '',
        description: '',
        category: 'General Remodel',
        budget_min: '',
        budget_max: '',
        location: '',
        timeline_days: '30',
      });
      setStatus('Draft saved. Review it below, then publish when ready.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not create project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="glass-card p-5 space-y-4">
      <div>
        <h3 className="font-outfit font-semibold text-[#0F172A] text-lg">New project draft</h3>
        <p className="text-sm text-[#64748B] mt-1">
          Your request stays private until you publish it.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          className={fieldClass}
          placeholder="Project title"
          value={form.title}
          onChange={(event) => update('title', event.target.value)}
          required
        />
        <input
          className={fieldClass}
          placeholder="Location"
          value={form.location}
          onChange={(event) => update('location', event.target.value)}
        />
        <select
          className={fieldClass}
          value={form.category}
          onChange={(event) => update('category', event.target.value)}
        >
          <option>General Remodel</option>
          <option>Kitchen Remodel</option>
          <option>Bathroom</option>
          <option>Roofing</option>
          <option>Flooring</option>
          <option>Electrical</option>
          <option>Plumbing</option>
          <option>Full Renovation</option>
          <option>New Construction</option>
        </select>
        <input
          className={fieldClass}
          type="number"
          min="1"
          placeholder="Timeline days"
          value={form.timeline_days}
          onChange={(event) => update('timeline_days', event.target.value)}
        />
        <input
          className={fieldClass}
          type="number"
          min="0"
          placeholder="Minimum budget"
          value={form.budget_min}
          onChange={(event) => update('budget_min', event.target.value)}
        />
        <input
          className={fieldClass}
          type="number"
          min="0"
          placeholder="Maximum budget"
          value={form.budget_max}
          onChange={(event) => update('budget_max', event.target.value)}
        />
      </div>

      <textarea
        className={fieldClass + ' min-h-[110px] resize-none'}
        placeholder="Describe the work, property condition, timing, and anything contractors should know."
        value={form.description}
        onChange={(event) => update('description', event.target.value)}
        required
      />

      {status && <p className="text-sm text-[#475569]">{status}</p>}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-semibold disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #7B2FF7 0%, #3B6BF7 55%, #00D4FF 100%)' }}
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Save Draft
      </button>
    </form>
  );
}

function BidComposer({ project, onSubmitted, onAccessLost }: {
  project: GcscPaidProjectBrief;
  onSubmitted: () => void;
  onAccessLost: () => void;
}) {
  const [form, setForm] = useState({ amount: '', proposed_timeline_days: String(project.timeline_days || 30), message: '' });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const submissionGate = useRef(createLatestRequestGate()).current;

  useEffect(() => () => submissionGate.invalidate(), [submissionGate]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || submissionComplete) return;
    const requestId = submissionGate.start();
    setSaving(true);
    setStatus('');
    try {
      await api.submitBid({
        project_id: project.id,
        amount: Number(form.amount || 0),
        proposed_timeline_days: Number(form.proposed_timeline_days || project.timeline_days || 30),
        message: form.message,
      });
      if (!submissionGate.isCurrent(requestId)) return;
      setSubmissionComplete(true);
      setStatus('Bid submitted. You can track it in My Bids.');
      setForm({ amount: '', proposed_timeline_days: String(project.timeline_days || 30), message: '' });
      onSubmitted();
    } catch (err) {
      if (!submissionGate.isCurrent(requestId)) return;
      if (err instanceof ApiError && [401, 403, 404].includes(err.status)) {
        onAccessLost();
      } else if (!(err instanceof ApiError) || err.status >= 500) {
        setSubmissionComplete(true);
        setStatus('Could not confirm submission. Check My Bids before trying again.');
      } else {
        setStatus(err.message);
      }
    } finally {
      if (submissionGate.isCurrent(requestId)) setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-3">
      <div>
        <h4 className="font-outfit font-semibold text-[#0F172A]">Submit a bid</h4>
        <p className="text-xs text-[#64748B] mt-1">Your proposal is saved to the backend and becomes visible to the homeowner.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          className={fieldClass}
          type="number"
          min="1"
          placeholder="Bid amount"
          value={form.amount}
          onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
          required
        />
        <input
          className={fieldClass}
          type="number"
          min="1"
          placeholder="Timeline days"
          value={form.proposed_timeline_days}
          onChange={(event) => setForm((current) => ({ ...current, proposed_timeline_days: event.target.value }))}
        />
      </div>
      <textarea
        className={fieldClass + ' min-h-[92px] resize-none'}
        placeholder="Explain your scope, materials approach, and milestone plan."
        value={form.message}
        onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
      />
      {status && <p className="text-sm text-[#475569]">{status}</p>}
      <button
        type="submit"
        disabled={saving || submissionComplete}
        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-white text-sm font-semibold disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #7B2FF7 0%, #3B6BF7 100%)' }}
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Gavel size={15} />}
        Send Bid
      </button>
    </form>
  );
}

type ProjectsPanelProps = { user: GcscUser; onOpenChat: (bidId: number) => void };

export function ProjectsPanel(props: ProjectsPanelProps) {
  // Remount before painting another account: no previous private state or draft is reused.
  return <AccountProjectsPanel key={`${props.user.id}:${props.user.role}`} {...props} />;
}

function AccountProjectsPanel({ user, onOpenChat }: ProjectsPanelProps) {
  const [filter, setFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [projects, setProjects] = useState<GcscProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<GcscProject | null>(null);
  const [paidBrief, setPaidBrief] = useState<{ project: GcscPaidProjectBrief; requestId: number } | null>(null);
  const [selectedBids, setSelectedBids] = useState<GcscBid[]>([]);
  const [selectedEscrow, setSelectedEscrow] = useState<GcscEscrow | null>(null);
  const [selectedMilestones, setSelectedMilestones] = useState<GcscMilestone[]>([]);
  const [biddingProjectId, setBiddingProjectId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailMessage, setDetailMessage] = useState('');
  const [publishingId, setPublishingId] = useState<number | null>(null);
  const requestGate = useRef(createLatestRequestGate()).current;
  const detailGate = useRef(createLatestRequestGate()).current;
  const isHomeowner = user.role === 'homeowner';
  const displayedProject = paidBrief?.project ?? selectedProject;

  const loadProjects = useCallback(async () => {
    const requestId = requestGate.start();
    setLoading(true);
    setError('');
    setProjects([]);
    try {
      let nextProjects: GcscProject[];
      if (isHomeowner) {
        const response = await api.getMyProjects();
        nextProjects = response.projects || [];
      } else {
        const [openResponse, myResponse] = await Promise.all([
          api.getProjects({ status: 'open' }),
          api.getMyProjects(),
        ]);
        const merged = new Map<number, GcscProject>();
        for (const project of [...(openResponse.projects || []), ...(myResponse.projects || [])]) {
          merged.set(project.id, project);
        }
        nextProjects = [...merged.values()];
      }
      if (!requestGate.isCurrent(requestId)) return;
      setProjects(nextProjects);
    } catch (err) {
      if (!requestGate.isCurrent(requestId)) return;
      setProjects([]);
      setSelectedProject(null);
      detailGate.invalidate();
      setPaidBrief(null);
      setBiddingProjectId(null);
      setDetailLoading(false);
      setSelectedBids([]);
      setSelectedEscrow(null);
      setSelectedMilestones([]);
      setError(err instanceof Error ? err.message : 'Could not load projects');
    } finally {
      if (requestGate.isCurrent(requestId)) setLoading(false);
    }
  }, [isHomeowner, requestGate, detailGate]);

  useEffect(() => {
    void loadProjects();
    return () => { requestGate.invalidate(); detailGate.invalidate(); };
  }, [loadProjects, requestGate, detailGate]);

  const loadDetails = async (projectId: number) => {
    const requestId = detailGate.start();
    setSelectedProject(null);
    setPaidBrief(null);
    setBiddingProjectId(null);
    setSelectedBids([]);
    setSelectedEscrow(null);
    setSelectedMilestones([]);
    setDetailLoading(true);
    setDetailMessage('');
    try {
      const response = await api.getProject(projectId);
      if (!detailGate.isCurrent(requestId)) return;
      if (!response.project || response.project.id !== projectId) throw new Error('Project unavailable. Please try again.');
      const project: GcscProject = response.project;
      const legacyContract = legacyEscrowWorkflowEnabled && !!project.escrow_id;
      setSelectedProject(isHomeowner || legacyContract ? project : {
        id: project.id, title: project.title, category: project.category,
        budget_min: project.budget_min, budget_max: project.budget_max,
        timeline_days: project.timeline_days, status: project.status, published_at: project.published_at,
      });
      if (isHomeowner || legacyContract) setSelectedBids(response.bids || []);
      if (user.role === 'contractor' && project.status === 'open' && !legacyContract) {
        const details = await api.getProjectDetails(projectId);
        if (!detailGate.isCurrent(requestId)) return;
        setPaidBrief({ project: details.project, requestId });
      }
      if (legacyEscrowWorkflowEnabled && response.project?.escrow_id) {
        const escrowResponse = await api.getEscrow(response.project.escrow_id);
        if (!detailGate.isCurrent(requestId)) return;
        setSelectedEscrow(escrowResponse.escrow);
        setSelectedMilestones(escrowResponse.milestones || []);
      }
    } catch (err) {
      if (!detailGate.isCurrent(requestId)) return;
      setPaidBrief(null);
      setDetailMessage(err instanceof ApiError && [401, 403, 404].includes(err.status)
        ? 'Project details are unavailable for this account. Access may have changed.'
        : 'Could not verify project details. Please try again.');
    } finally {
      if (detailGate.isCurrent(requestId)) setDetailLoading(false);
    }
  };

  const acceptBid = async (bid: GcscBid) => {
    if (!selectedProject) return;
    setDetailMessage('');
    if (!bid.contractor_verification?.ready_for_bids) {
      setDetailMessage('Contractor must be verified before bid acceptance.');
      return;
    }

    try {
      await api.acceptBid(bid.id);
      setDetailMessage('Bid accepted. Escrow record created.');
      await Promise.all([loadDetails(selectedProject.id), loadProjects()]);
    } catch (err) {
      setDetailMessage(err instanceof Error ? err.message : 'Could not accept bid');
    }
  };

  const onProjectCreated = (project: GcscProject) => {
    setProjects((current) => [project, ...current]);
    setSelectedProject(project);
    setSelectedBids([]);
    setSelectedEscrow(null);
    setSelectedMilestones([]);
  };

  const publishProject = async (project: GcscProject) => {
    setPublishingId(project.id);
    setDetailMessage('');
    try {
      const response = await api.publishProject(project.id);
      setSelectedProject(response.project);
      setProjects((current) => current.map((item) => item.id === project.id ? response.project : item));
      setDetailMessage('Project published. Contractors can now see its preview.');
    } catch (err) {
      setDetailMessage(err instanceof Error ? err.message : 'Could not publish project');
    } finally {
      setPublishingId(null);
    }
  };

  const filtered = useMemo(() => {
    return projects.filter((project) => {
      const label = project.published === false ? 'Draft' : projectStatusLabel(project.status);
      const matchesFilter = filter === 'All' || label === filter;
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || [project.title, project.category, project.location, String(project.id)]
        .filter(Boolean)
        .some((item) => String(item).toLowerCase().includes(q));
      return matchesFilter && matchesSearch;
    });
  }, [filter, search, projects]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="space-y-6"
      aria-busy={loading}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-outfit font-bold text-[1.5rem] text-[#0F172A]">
            {isHomeowner ? 'My Projects' : 'Open Projects'}
          </h2>
          <p className="font-inter text-sm text-[#475569] mt-1">
            {isHomeowner
              ? 'Save a private draft, then publish it when ready.'
              : 'Browse project previews. Full details require project-specific access.'}
          </p>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9 pr-4 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#7B2FF7]/30 focus:border-[#7B2FF7] transition-all w-full sm:w-[240px]"
          />
        </div>
      </div>

      {isHomeowner && <ProjectRequestForm onCreated={onProjectCreated} />}

      <div className="flex items-center gap-2 flex-wrap">
        {(['All', ...(isHomeowner ? ['Draft'] : []), 'Open', 'In Progress', 'Completed', 'Cancelled'] as const).map((status) => (
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
          <SlidersHorizontal size={16} className="inline mr-1" />
          {filtered.length} project{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {error && (
        <div role="alert" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#B91C1C]">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadProjects()}
            className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#FCA5A5] bg-white px-4 font-semibold text-[#991B1B] hover:bg-[#FFF7F7]"
          >
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.95fr] gap-6">
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  <th className="text-left px-4 py-3 font-semibold text-[#0F172A] text-xs uppercase tracking-wider">Project</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#0F172A] text-xs uppercase tracking-wider">Category</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#0F172A] text-xs uppercase tracking-wider">Location</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#0F172A] text-xs uppercase tracking-wider">Budget</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#0F172A] text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#0F172A] text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[#64748B]">
                      <Loader2 size={18} className="animate-spin inline mr-2" /> Loading projects...
                    </td>
                  </tr>
                ) : filtered.map((project) => {
                  const label = project.published === false ? 'Draft' : projectStatusLabel(project.status);
                  return (
                    <tr key={project.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#0F172A]">{project.title}</div>
                        <div className="font-mono text-xs text-[#3B6BF7]">#{project.id}</div>
                      </td>
                      <td className="px-4 py-3 text-[#475569]">{project.category || 'General'}</td>
                      <td className="px-4 py-3 text-[#475569]">
                        {isHomeowner ? project.location || 'Not set' : 'Not disclosed'}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#0F172A]">
                        {formatCurrency(project.budget_min || 0)} - {formatCurrency(project.budget_max || 0)}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={label} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => void loadDetails(project.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0] hover:text-[#0F172A] transition-colors"
                          >
                            <Eye size={12} /> View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!loading && filtered.length === 0 && (
            <div className="text-center py-12 text-[#94A3B8]">
              {isHomeowner ? 'No projects yet. Create the first one above.' : 'No open projects are available right now.'}
            </div>
          )}
        </div>

        <aside className="glass-card p-5 min-h-[320px]" aria-label="Project details" aria-busy={detailLoading}>
          {detailLoading ? (
            <div className="h-full flex items-center justify-center text-[#64748B]">
              <Loader2 size={18} className="animate-spin mr-2" /> Loading details...
            </div>
          ) : selectedProject && displayedProject ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider gradient-text">Selected Project</p>
                <h3 className="font-outfit font-bold text-xl text-[#0F172A] mt-1 break-words">{displayedProject.title}</h3>
                <p className="text-sm text-[#64748B] mt-2 leading-6 whitespace-pre-wrap break-words">
                  {displayedProject.description || (isHomeowner ? 'No description yet.' : 'Full project details require confirmed access to this lead.')}
                </p>
              </div>
              {!isHomeowner && (
                <button type="button" onClick={() => void loadDetails(selectedProject.id)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#CBD5E1] px-3 py-2 text-sm font-semibold text-[#334155]">
                  <RefreshCw size={16} /> {paidBrief ? 'Refresh details' : 'Check access'}
                </button>
              )}
              {isHomeowner && selectedProject.published !== true && selectedProject.status === 'open' && (
                <button
                  type="button"
                  onClick={() => void publishProject(selectedProject)}
                  disabled={publishingId === selectedProject.id}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#0F766E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {publishingId === selectedProject.id ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Publish project
                </button>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-[#F8FAFC] p-3">
                  <p className="text-xs text-[#94A3B8]">Timeline</p>
                  <p className="font-semibold text-[#0F172A]">{displayedProject.timeline_days || 30} days</p>
                </div>
                <div className="rounded-xl bg-[#F8FAFC] p-3">
                  <p className="text-xs text-[#94A3B8]">Status</p>
                  <p className="font-semibold text-[#0F172A]">
                    {selectedProject.published === false ? 'Draft' : projectStatusLabel(selectedProject.status)}
                  </p>
                </div>
              </div>

              {isHomeowner ? (
                <div className="space-y-3">
                  <h4 className="font-outfit font-semibold text-[#0F172A]">Contractor bids</h4>
                  {selectedBids.length === 0 ? (
                    <p className="text-sm text-[#64748B]">No bids yet.</p>
                  ) : selectedBids.map((bid) => {
                    const label = bidStatusLabel(bid.status);
                    const contractor = bid.contractor;
                    const contractorName = contractor?.companyName || contractor?.full_name || `Contractor #${bid.contractor_id}`;
                    const specialties = contractor?.specialties || [];
                    const canAccept = !!bid.contractor_verification?.ready_for_bids;
                    return (
                      <div key={bid.id} className="rounded-2xl border border-[#E2E8F0] p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#7B2FF7] to-[#00D4FF] flex items-center justify-center overflow-hidden shrink-0">
                              {contractor?.logoDataUrl ? (
                                <img src={contractor.logoDataUrl} alt={contractorName} className="w-full h-full object-cover" />
                              ) : (
                                <Building2 size={18} className="text-white" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-[#0F172A] truncate">{contractorName}</p>
                              <p className="text-xs text-[#64748B]">
                                Contractor #{bid.contractor_id} - {bid.proposed_timeline_days || 30} days
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-semibold text-[#0F172A]">{formatCurrency(bid.amount)}</p>
                            <StatusBadge status={label} />
                          </div>
                        </div>
                        <ContractorTrustBadge verification={bid.contractor_verification} />
                        {(contractor?.serviceArea || specialties.length > 0) && (
                          <div className="flex flex-wrap gap-2 text-xs">
                            {contractor?.serviceArea && (
                              <span className="px-2.5 py-1 rounded-full bg-[rgba(59,107,247,0.08)] text-[#3B6BF7] font-semibold">
                                {contractor.serviceArea}
                              </span>
                            )}
                            {specialties.slice(0, 3).map((item) => (
                              <span key={item} className="px-2.5 py-1 rounded-full bg-[rgba(123,47,247,0.08)] text-[#7B2FF7] font-semibold">
                                {item}
                              </span>
                            ))}
                          </div>
                        )}
                        {bid.message && <p className="text-sm text-[#475569] leading-6">{bid.message}</p>}
                        <Link
                          to={`/contractors/${bid.contractor_id}`}
                          className="inline-flex items-center gap-2 rounded-full border border-[#C4B5FD] px-4 py-2 text-xs font-semibold text-[#7B2FF7] hover:bg-[rgba(123,47,247,0.06)] transition-colors"
                        >
                          <UserCircle size={14} /> View profile
                        </Link>
                        <button
                          type="button"
                          onClick={() => onOpenChat(bid.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-[#C4B5FD] px-4 py-2 text-xs font-semibold text-[#7B2FF7] hover:bg-[rgba(123,47,247,0.06)] transition-colors"
                        >
                          <MessageCircle size={14} /> Open chat
                        </button>
                        {legacyEscrowWorkflowEnabled && bid.status === 'pending' && selectedProject.status === 'open' && (
                          <button
                            onClick={() => void acceptBid(bid)}
                            disabled={!canAccept}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg, #7B2FF7 0%, #3B6BF7 100%)' }}
                          >
                            <CheckCircle2 size={14} /> {canAccept ? 'Accept and Create Escrow' : 'Verification Required'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : !paidBrief ? (
                <p className="text-sm text-[#475569]" role="status">
                  Purchasing lead access is not available yet. No payment is requested here.
                </p>
              ) : biddingProjectId === selectedProject.id ? (
                <BidComposer key={`${selectedProject.id}:${paidBrief.requestId}`} project={paidBrief.project}
                  onSubmitted={() => { if (detailGate.isCurrent(paidBrief.requestId)) void loadProjects(); }}
                  onAccessLost={() => {
                    if (!detailGate.isCurrent(paidBrief.requestId)) return;
                    detailGate.invalidate();
                    setPaidBrief(null);
                    setBiddingProjectId(null);
                    setDetailMessage('Access has changed. Your bid was not submitted. Check access before trying again.');
                  }} />
              ) : (
                <button
                  onClick={() => setBiddingProjectId(selectedProject.id)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-semibold"
                  style={{ background: 'linear-gradient(135deg, #7B2FF7 0%, #3B6BF7 100%)' }}
                >
                  <Gavel size={15} /> Prepare Bid
                </button>
              )}

              {legacyEscrowWorkflowEnabled && selectedEscrow && (
                <MilestoneManager
                  escrow={selectedEscrow}
                  milestones={selectedMilestones}
                  user={user}
                  onChanged={() => void loadDetails(selectedProject.id)}
                />
              )}

              {detailMessage && <p className="text-sm text-[#475569]">{detailMessage}</p>}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-[#64748B] py-10">
              <ClipboardList size={32} className="text-[#94A3B8] mb-3" />
              <p className="font-semibold text-[#0F172A]">Select a project</p>
              <p className="text-sm mt-1">{detailMessage || 'Project details and proposals appear here.'}</p>
            </div>
          )}
        </aside>
      </div>
    </motion.div>
  );
}
