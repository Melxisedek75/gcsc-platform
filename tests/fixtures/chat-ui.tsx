import React, { useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { ChatPanel } from '/src/pages/dashboard/ChatPanel';

const owner = new URLSearchParams(location.search).has('owner');
const user = owner
  ? { id: 2, email: 'owner@example.invalid', role: 'homeowner' as const, full_name: 'Fixture Owner' }
  : { id: 7, email: 'contractor@example.invalid', role: 'contractor' as const, full_name: 'Fixture Contractor' };

function Fixture() {
  const [bidId, setBidId] = useState<number | null>(17);
  const consume = useCallback(() => setBidId(null), []);
  return <main className="min-h-screen bg-white p-4"><ChatPanel user={user} initialBidId={bidId} onBidConsumed={consume} /></main>;
}

createRoot(document.getElementById('root')!).render(<Fixture />);
