import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { api, type GcscUserDocument } from '../../services/api';

export function DocumentDownloadButton({ document: file }: { document: GcscUserDocument }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const download = async () => {
    setBusy(true);
    setError('');
    let url: string | undefined;
    try {
      const result = await api.getDocumentFile(file);
      const bytes = Uint8Array.from(atob(result.file_data_url.split(',')[1]), char => char.charCodeAt(0));
      url = URL.createObjectURL(new Blob([bytes], { type: result.document.mime_type }));
      const link = document.createElement('a');
      link.href = url;
      link.download = result.document.file_name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download document');
    } finally {
      if (url) setTimeout(() => URL.revokeObjectURL(url!), 1000);
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 min-w-0">
      <button type="button" onClick={download} disabled={busy}
        title="Download document"
        className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[#CBD5E1] bg-white px-3 py-1.5 text-sm text-[#0F172A] disabled:opacity-50">
        {busy ? <Loader2 size={16} className="animate-spin shrink-0" /> : <Download size={16} className="shrink-0" />}
        Download
      </button>
      {error && <p role="alert" className="mt-2 break-words text-sm text-[#B91C1C]">{error}</p>}
    </div>
  );
}
