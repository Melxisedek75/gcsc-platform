import { useState, type FormEvent } from 'react';
import { Loader2, Plus, CheckCircle2, AlertTriangle, DollarSign, PlugZap, ShieldCheck } from 'lucide-react';
import { api, type GcscChainTx, type GcscEscrow, type GcscMilestone, type GcscUser } from '../../services/api';
import { signEscrowMilestoneAction, type EscrowMilestoneChainAction } from '../../services/xprSettlement';
import { fieldClass, formatCurrency, projectStatusLabel, milestoneStatusLabel } from './format';
import { StatusBadge } from './shared';

function MilestoneComposer({ escrow, onCreated }: { escrow: GcscEscrow; onCreated: () => void }) {
  const [form, setForm] = useState({ title: '', description: '', amount: '' });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setStatus('');
    try {
      await api.createMilestone(escrow.id, {
        title: form.title,
        description: form.description,
        amount: Number(form.amount || 0),
      });
      setForm({ title: '', description: '', amount: '' });
      setStatus('Milestone created.');
      onCreated();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not create milestone');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-3">
      <div>
        <h4 className="font-outfit font-semibold gradient-text">Add milestone</h4>
        <p className="text-xs text-[#64748B] mt-1">Split escrow work into clear payment checkpoints.</p>
      </div>
      <input
        className={fieldClass}
        placeholder="Milestone title"
        value={form.title}
        onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
        required
      />
      <input
        className={fieldClass}
        type="number"
        min="1"
        placeholder="Amount"
        value={form.amount}
        onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
        required
      />
      <textarea
        className={fieldClass + ' min-h-[82px] resize-none'}
        placeholder="Describe the acceptance criteria."
        value={form.description}
        onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
      />
      {status && <p className="text-sm text-[#475569]">{status}</p>}
      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-white text-xs font-semibold disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #7B2FF7 0%, #3B6BF7 100%)' }}
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        Add Milestone
      </button>
    </form>
  );
}

export function MilestoneManager({
  escrow,
  milestones,
  user,
  onChanged,
}: {
  escrow: GcscEscrow;
  milestones: GcscMilestone[];
  user: GcscUser;
  onChanged: () => void;
}) {
  const [status, setStatus] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [chainStatus, setChainStatus] = useState('');
  const [chainBusyId, setChainBusyId] = useState<string | null>(null);
  const [verifyBusyId, setVerifyBusyId] = useState<string | null>(null);
  const isHomeowner = user.role === 'homeowner';
  const isContractor = user.role === 'contractor';

  const runAction = async (milestoneId: number, action: 'submit' | 'approve' | 'release' | 'dispute') => {
    setBusyId(milestoneId);
    setStatus('');
    try {
      if (action === 'submit') await api.submitMilestone(milestoneId);
      if (action === 'approve') await api.approveMilestone(milestoneId);
      if (action === 'release') await api.releaseMilestone(milestoneId);
      if (action === 'dispute') await api.disputeMilestone(milestoneId);
      setStatus(`Milestone ${action} saved.`);
      onChanged();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not update milestone');
    } finally {
      setBusyId(null);
    }
  };

  const verifyChainTx = async (milestone: GcscMilestone, tx: GcscChainTx) => {
    setVerifyBusyId(tx.tx_id);
    setChainStatus('');
    try {
      const response = await api.verifyMilestoneChainTx(milestone.id, tx.tx_id);
      setChainStatus(`Transaction ${response.chain_tx.status}: ${tx.tx_id.slice(0, 12)}...`);
      onChanged();
    } catch (err) {
      setChainStatus(err instanceof Error ? err.message : 'Could not verify chain transaction');
    } finally {
      setVerifyBusyId(null);
    }
  };

  const signTestnetAction = async (milestone: GcscMilestone, action: EscrowMilestoneChainAction) => {
    const key = `${milestone.id}:${action}`;
    const expectedWallet = user.wallet?.accountName?.trim();
    if (!expectedWallet) {
      setChainStatus('Connect WebAuth wallet before signing escrow actions.');
      return;
    }

    setChainBusyId(key);
    setChainStatus('');
    try {
      const result = await signEscrowMilestoneAction({
        action,
        escrowId: escrow.id,
        milestoneId: milestone.id,
        evidenceHash: milestone.description || milestone.title || `milestone-${milestone.id}`,
      });
      if (result.wallet.accountName !== expectedWallet) {
        throw new Error(`Connected WebAuth account must match saved wallet ${expectedWallet}.`);
      }
      if (!result.transactionId) {
        throw new Error('WebAuth did not return a transaction id. Nothing was recorded.');
      }
      await api.recordMilestoneChainTx(milestone.id, {
        action: result.action,
        tx_id: result.transactionId,
        chain_id: result.chainId,
        contract_account: result.contractAccount,
        actor: result.wallet.accountName,
        status: 'broadcast',
      });
      onChanged();
      setChainStatus(`Testnet action signed by ${result.wallet.accountName} and saved to audit trail. Transaction: ${result.transactionId.slice(0, 12)}...`);
    } catch (err) {
      setChainStatus(err instanceof Error ? err.message : 'Could not sign testnet escrow action');
    } finally {
      setChainBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="font-outfit font-semibold gradient-text">Milestones</h4>
          <p className="text-xs text-[#64748B] mt-1">
            Escrow #{escrow.id} - {formatCurrency(escrow.total_amount)} - {projectStatusLabel(escrow.status)}
          </p>
        </div>
        <StatusBadge status={projectStatusLabel(escrow.status)} />
      </div>

      {isHomeowner && escrow.status !== 'disputed' && escrow.status !== 'completed' && (
        <MilestoneComposer escrow={escrow} onCreated={onChanged} />
      )}

      {milestones.length === 0 ? (
        <p className="text-sm text-[#64748B]">No milestones yet.</p>
      ) : milestones.map((milestone) => {
        const label = milestoneStatusLabel(milestone.status);
        const canSubmit = isContractor && milestone.status === 'pending' && escrow.status !== 'disputed';
        const canApprove = isHomeowner && milestone.status === 'submitted' && escrow.status !== 'disputed';
        const canRelease = isHomeowner && milestone.status === 'approved' && escrow.status !== 'disputed';
        const canDispute = milestone.status !== 'released' && milestone.status !== 'disputed' && escrow.status !== 'completed';
        const canSignSubmit = isContractor && (milestone.status === 'pending' || milestone.status === 'submitted') && escrow.status !== 'disputed';
        const canSignApprove = isHomeowner && (milestone.status === 'submitted' || milestone.status === 'approved') && escrow.status !== 'disputed';
        const canSignRelease = isHomeowner && milestone.status === 'approved' && escrow.status !== 'disputed';
        const canSignDispute = canDispute;
        const chainTxs = milestone.chain_txs || [];
        const busy = busyId === milestone.id;

        return (
          <div key={milestone.id} className="rounded-2xl border border-[#E2E8F0] p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-[#0F172A]">{milestone.title}</p>
                <p className="text-xs text-[#64748B]">{formatCurrency(milestone.amount)}</p>
              </div>
              <StatusBadge status={label} />
            </div>
            {milestone.description && <p className="text-sm text-[#475569] leading-6">{milestone.description}</p>}
            {chainTxs.length > 0 && (
              <div className="rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#3B6BF7]">
                  On-chain audit trail
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {chainTxs.slice(0, 3).map((tx) => (
                    <span
                      key={tx.id}
                      className="inline-flex items-center gap-1.5 rounded-md bg-white border border-[#BFDBFE] px-2.5 py-1"
                    >
                      <a
                        href={`https://testnet.explorer.xprnetwork.org/transaction/${tx.tx_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3B6BF7] hover:text-[#7B2FF7]"
                        title={tx.tx_id}
                      >
                        {tx.action.replace('milestone', '')}
                        <span className="text-[#64748B]">{tx.tx_id.slice(0, 8)}...</span>
                      </a>
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                        style={{
                          color: tx.status === 'confirmed' ? '#10B981' : tx.status === 'failed' ? '#EF4444' : '#F59E0B',
                          backgroundColor: tx.status === 'confirmed'
                            ? 'rgba(16,185,129,0.12)'
                            : tx.status === 'failed'
                              ? 'rgba(239,68,68,0.12)'
                              : 'rgba(245,158,11,0.12)',
                        }}
                      >
                        {tx.status}
                      </span>
                      {tx.status === 'broadcast' && (
                        <button
                          type="button"
                          onClick={() => void verifyChainTx(milestone, tx)}
                          disabled={verifyBusyId === tx.tx_id}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7B2FF7] disabled:opacity-60"
                        >
                          {verifyBusyId === tx.tx_id ? <Loader2 size={11} className="animate-spin" /> : <ShieldCheck size={11} />}
                          Verify Tx
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {canSubmit && (
                <button
                  onClick={() => void runAction(milestone.id, 'submit')}
                  disabled={busy}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold text-white disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #7B2FF7 0%, #3B6BF7 100%)' }}
                >
                  {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                  Submit
                </button>
              )}
              {canApprove && (
                <button
                  onClick={() => void runAction(milestone.id, 'approve')}
                  disabled={busy}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold text-white disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #3B6BF7 0%, #00D4FF 100%)' }}
                >
                  {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                  Approve
                </button>
              )}
              {canRelease && (
                <button
                  onClick={() => void runAction(milestone.id, 'release')}
                  disabled={busy}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold text-white disabled:opacity-60"
                  style={{ background: '#10B981' }}
                >
                  {busy ? <Loader2 size={12} className="animate-spin" /> : <DollarSign size={12} />}
                  Release
                </button>
              )}
              {canDispute && (
                <button
                  onClick={() => void runAction(milestone.id, 'dispute')}
                  disabled={busy}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#FEF2F2] text-[#EF4444] disabled:opacity-60"
                >
                  {busy ? <Loader2 size={12} className="animate-spin" /> : <AlertTriangle size={12} />}
                  Dispute
                </button>
              )}
            </div>
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7B2FF7]">
                Testnet signing only
              </p>
              <p className="text-xs text-[#64748B] mt-1">
                WebAuth can sign the matching gcscrow1111 action on XPR testnet. Backend status changes stay separate.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {canSignSubmit && (
                  <button
                    onClick={() => void signTestnetAction(milestone, 'submitms')}
                    disabled={chainBusyId === `${milestone.id}:submitms`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-white text-[#7B2FF7] border border-[#C4B5FD] disabled:opacity-60"
                  >
                    {chainBusyId === `${milestone.id}:submitms` ? <Loader2 size={12} className="animate-spin" /> : <PlugZap size={12} />}
                    Sign Testnet Submit
                  </button>
                )}
                {canSignApprove && (
                  <button
                    onClick={() => void signTestnetAction(milestone, 'approvems')}
                    disabled={chainBusyId === `${milestone.id}:approvems`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-white text-[#3B6BF7] border border-[#BFDBFE] disabled:opacity-60"
                  >
                    {chainBusyId === `${milestone.id}:approvems` ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    Sign Testnet Approve
                  </button>
                )}
                {canSignRelease && (
                  <button
                    onClick={() => void signTestnetAction(milestone, 'releasems')}
                    disabled={chainBusyId === `${milestone.id}:releasems`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-white text-[#10B981] border border-[#A7F3D0] disabled:opacity-60"
                  >
                    {chainBusyId === `${milestone.id}:releasems` ? <Loader2 size={12} className="animate-spin" /> : <DollarSign size={12} />}
                    Sign Testnet Release
                  </button>
                )}
                {canSignDispute && (
                  <button
                    onClick={() => void signTestnetAction(milestone, 'disputems')}
                    disabled={chainBusyId === `${milestone.id}:disputems`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-white text-[#EF4444] border border-[#FECACA] disabled:opacity-60"
                  >
                    {chainBusyId === `${milestone.id}:disputems` ? <Loader2 size={12} className="animate-spin" /> : <AlertTriangle size={12} />}
                    Sign Testnet Dispute
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {status && <p className="text-sm text-[#475569]">{status}</p>}
      {chainStatus && <p className="text-sm text-[#475569]">{chainStatus}</p>}
    </div>
  );
}
