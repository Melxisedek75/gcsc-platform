import type { LucideIcon } from 'lucide-react';
import type { GcscFinancingProductType } from '../../services/api';

export type Section =
  | 'projects'
  | 'estimator'
  | 'bids'
  | 'loans'
  | 'profile'
  | 'compliance'
  | 'admin-review'
  | 'admin-financing'
  | 'admin-audit'
  | 'wallet'
  | 'token';

export type AccountRole = 'contractor' | 'homeowner';

export type FinancingProduct = {
  id: string;
  productType: GcscFinancingProductType;
  title: string;
  bestFor: AccountRole;
  icon: LucideIcon;
  summary: string;
  example: string[];
  rule: string;
  status: string;
  cta: string;
  whatThisIs: string;
  howItWorks: string[];
  checks: string[];
  documents: string[];
};
