const full = 'Every file imported or explicitly excluded in import-manifest.json.';
export const sourceOrigins = {
  website: { repository: 'https://github.com/Melxisedek75/gcsc-website', ref: 'refs/heads/main', archiveRef: 'archive/website/main', selection: full },
  backend: { repository: 'https://github.com/Melxisedek75/gcsc-smart-contractor', ref: 'refs/heads/main', archiveRef: 'archive/backend/main', selection: full },
  store: { repository: 'https://github.com/Melxisedek75/gcsc-store', ref: 'refs/heads/api-backend', archiveRef: 'archive/store/api-backend', selection: full },
  'whitepaper-v14': { repository: 'local preserved gcsc-website history', ref: 'archive/website/internal-whitepaper-v14', archiveRef: 'archive/website/internal-whitepaper-v14',
    selection: 'Full tree attested; only four manifest-listed whitepaper files selected. All other paths intentionally excluded from this source.' },
};
