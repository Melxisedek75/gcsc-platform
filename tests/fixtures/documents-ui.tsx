import React from 'react';
import { createRoot } from 'react-dom/client';
import { AdminDocumentReviewPanel } from '/src/pages/dashboard/AdminDocumentReviewPanel';
import { CompliancePanel } from '/src/pages/dashboard/CompliancePanel';
import { api } from '/src/services/api';
import '/src/index.css';

api.setToken('document-ui-fixture-only');
const owner = new URLSearchParams(location.search).has('owner');
createRoot(document.getElementById('root')!).render(
  <main style={{ maxWidth: 1120, margin: '0 auto', padding: 16 }}>
    {owner ? <CompliancePanel user={{ id: 1, role: 'contractor' }} /> : <AdminDocumentReviewPanel />}
  </main>,
);
