import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
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
} from 'lucide-react';
import {
  api,
  type GcscBid,
  type GcscEscrow,
  type GcscMilestone,
  type GcscProject,
  type GcscUser,
} from '../../services/api';
import { fieldClass, formatCurrency, projectStatusLabel, bidStatusLabel } from './format';
import { StatusBadge, ContractorTrustBadge } from './shared';
import { MilestoneManager } from './MilestoneManager';

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
      setStatus('Project posted. Contractors can now submit bids.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not create project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="glass-card p-5 space-y-4">
      <div>
        <h3 className="font-outfit font-semibold text-[#0F172A] text-lg">Post a project</h3>
        <p className="text-sm text-[#64748B] mt-1">
          Create a real homeowner project in the backend so contractors can bid on it.
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
        Create Project
      </button>
    </form>
  );
}

function BidComposer({ project, onSubmitted }: { project: GcscProject; onSubmitted: () => void }) {
  const [form, setForm] = useState({ amount: '', proposed_timeline_days: String(project.timeline_days || 30), message: '' });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setStatus('');
    try {
      await api.submitBid({
        project_id: project.id,
        amount: Number(form.amount || 0),
        proposed_timeline_days: Number(form.proposed_timeline_days || project.timeline_days || 30),
        message: form.message,
      });
      setStatus('Bid submitted. You can track it in My Bids.');
      setForm({ amount: '', proposed_timeline_days: String(project.timeline_days || 30), message: '' });
      onSubmitted();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not submit bid');
    } finally {
      setSaving(false);
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
        disabled={saving}
        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-white text-sm font-semibold disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #7B2FF7 0%, #3B6BF7 100%)' }}
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Gavel size={15} />}
        Send Bid
      </button>
    </form>
  );
}

export function ProjectsPanel({ user }: { user: GcscUser }) {
  const [filter, setFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [projects, setProjects] = useState<GcscProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<GcscProject | null>(null);
  const [selectedBids, setSelectedBids] = useState<GcscBid[]>([]);
  const [selectedEscrow, setSelectedEscrow] = useState<GcscEscrow | null>(null);
  const [selectedMilestones, setSelectedMilestones] = useState<GcscMilestone[]>([]);
  const [biddingProjectId, setBiddingProjectId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailMessage, setDetailMessage] = useState('');
  const isHomeowner = user.role === 'homeowner';

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (isHomeowner) {
        const response = await api.getMyProjects();
        setProjects(response.projects || []);
      } else {
        const [openResponse, myResponse] = await Promise.all([
          api.getProjects({ status: 'open' }),
          api.getMyProjects(),
        ]);
        const merged = new Map<number, GcscProject>();
        for (const project of [...(openResponse.projects || []), ...(myResponse.projects || [])]) {
          merged.set(project.id, project);
        }
        setProjects([...merged.values()]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load projects');
    } finally {
      setLoading(false);
    }
  }, [isHomeowner]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const loadDetails = async (projectId: number) => {
    setDetailLoading(true);
    setDetailMessage('');
    try {
      const response = await api.getProject(projectId);
      setSelectedProject(response.project);
      setSelectedBids(response.bids || []);
      setSelectedEscrow(null);
      setSelectedMilestones([]);
      if (response.project?.escrow_id) {
        const escrowResponse = await api.getEscrow(response.project.escrow_id);
        setSelectedEscrow(escrowResponse.escrow);
        setSelectedMilestones(escrowResponse.milestones || []);
      }
    } catch (err) {
      setDetailMessage(err instanceof Error ? err.message : 'Could not load project details');
    } finally {
      setDetailLoading(false);
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

  const filtered = useMemo(() => {
    return projects.filter((project) => {
      const label = projectStatusLabel(project.status);
      const matchesFilter = filter === 'All' || label === filter;
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || [project.title, project.category, project.location, String(project.id)]
        .filter(Boolean)
        .some((item) => item.toLowerCase().includes(q));
      return matchesFilter && matchesSearch;
    });
  }, [filter, search, projects]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-outfit font-bold text-[1.5rem] text-[#0F172A]">
            {isHomeowner ? 'My Projects' : 'Open Projects'}
          </h2>
          <p className="font-inter text-sm text-[#475569] mt-1">
            {isHomeowner
              ? 'Create project requests, review contractor bids, and move accepted work into escrow.'
              : 'Review homeowner requests and submit real bids through the backend API.'}
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
        {(['All', 'Open', 'In Progress', 'Completed', 'Cancelled'] as const).map((status) => (
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

      {error && <div className="glass-card p-4 text-sm text-[#EF4444]">{error}</div>}

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
                  const label = projectStatusLabel(project.status);
                  return (
                    <tr key={project.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#0F172A]">{project.title}</div>
                        <div className="font-mono text-xs text-[#3B6BF7]">#{project.id}</div>
                      </td>
                      <td className="px-4 py-3 text-[#475569]">{project.category || 'General'}</td>
                      <td className="px-4 py-3 text-[#475569]">{project.location || 'Not set'}</td>
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
                          {!isHomeowner && project.status === 'open' && (
                            <button
                              onClick={() => {
                                setBiddingProjectId(project.id);
                                setSelectedProject(project);
                                setSelectedBids([]);
                                setSelectedEscrow(null);
                                setSelectedMilestones([]);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium text-white transition-all hover:scale-[1.04]"
                              style={{ background: 'linear-gradient(135deg, #7B2FF7 0%, #3B6BF7 100%)' }}
                            >
                              <Gavel size={12} /> Bid
                            </button>
                          )}
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

        <aside className="glass-card p-5 min-h-[320px]">
          {detailLoading ? (
            <div className="h-full flex items-center justify-center text-[#64748B]">
              <Loader2 size={18} className="animate-spin mr-2" /> Loading details...
            </div>
          ) : selectedProject ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider gradient-text">Selected Project</p>
                <h3 className="font-outfit font-bold text-xl text-[#0F172A] mt-1">{selectedProject.title}</h3>
                <p className="text-sm text-[#64748B] mt-2 leading-6">{selectedProject.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-[#F8FAFC] p-3">
                  <p className="text-xs text-[#94A3B8]">Timeline</p>
                  <p className="font-semibold text-[#0F172A]">{selectedProject.timeline_days || 30} days</p>
                </div>
                <div className="rounded-xl bg-[#F8FAFC] p-3">
                  <p className="text-xs text-[#94A3B8]">Status</p>
                  <p className="font-semibold text-[#0F172A]">{projectStatusLabel(selectedProject.status)}</p>
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
                        {bid.status === 'pending' && selectedProject.status === 'open' && (
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
              ) : biddingProjectId === selectedProject.id ? (
                <BidComposer project={selectedProject} onSubmitted={() => void loadProjects()} />
              ) : (
                <button
                  onClick={() => setBiddingProjectId(selectedProject.id)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-semibold"
                  style={{ background: 'linear-gradient(135deg, #7B2FF7 0%, #3B6BF7 100%)' }}
                >
                  <Gavel size={15} /> Prepare Bid
                </button>
              )}

              {selectedEscrow && (
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
              <p className="text-sm mt-1">Project details, bids, and escrow actions appear here.</p>
            </div>
          )}
        </aside>
      </div>
    </motion.div>
  );
}
