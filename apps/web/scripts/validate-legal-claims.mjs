import fs from 'fs'
import path from 'path'
import { readDashboardSource } from './lib/dashboard-source.mjs';

const root = process.cwd()
const files = [
  'src/pages/Token.tsx',
  'src/pages/Security.tsx',
  'src/pages/Home.tsx',
  'src/pages/About.tsx',
  'src/pages/Pricing.tsx',
]

const bannedClaims = [
  'Earn passive income',
  'passive income',
  'FDIC-insured',
  'lowest card fees in the industry',
  '24/7 live human support',
  'Available in US, Australia & New Zealand',
  'emerging SEC guidance',
  'military-grade',
  'All code undergoes mandatory security review',
  'penetration testing before deployment',
  'All sensitive data is encrypted at rest',
  'Private keys are stored in hardware security modules',
  'MFA is required for all accounts',
  'no risk of double-spending',
  'All critical data is replicated across multiple geographic regions',
  'RTO (Recovery Time Objective) is under 1 hour',
  'Every project creates a unique smart contract',
  'Once deployed, it cannot be altered by any party',
  'Every deposit, milestone approval, and payment release is recorded',
  'escrow operations happen instantly',
  'SOC 2 Type II' + "' },",
]

const issues = []
for (const file of files) {
  const fullPath = path.join(root, file)
  if (!fs.existsSync(fullPath)) continue
  const source = fs.readFileSync(fullPath, 'utf8')
  for (const claim of bannedClaims) {
    if (source.includes(claim)) {
      issues.push(`${file}: unsupported claim still present: ${claim}`)
    }
  }
}

const dashboardSource = readDashboardSource(root)
for (const claim of bannedClaims) {
  if (dashboardSource.includes(claim)) {
    issues.push(`src/pages/dashboard: unsupported claim still present: ${claim}`)
  }
}

const security = fs.readFileSync(path.join(root, 'src/pages/Security.tsx'), 'utf8')
const token = fs.readFileSync(path.join(root, 'src/pages/Token.tsx'), 'utf8')

const requiredEvidence = [
  {
    ok: security.includes('Compliance Roadmap') && security.includes('No completed third-party production audit has been published yet.'),
    message: 'Security page must present certifications/audits as roadmap items, not completed claims.',
  },
  {
    ok: token.includes('Coming Soon') && token.includes('Token launch date to be announced.'),
    message: 'Token page must keep token launch as Coming Soon.',
  },
  {
    ok: token.includes('Availability and supported payment methods depend on Metal Pay eligibility and jurisdiction.'),
    message: 'Metal Pay copy must include availability and eligibility limits.',
  },
  {
    ok: security.includes('Legal and regulatory review is planned before any digital asset custody or financial-service expansion.'),
    message: 'Security page must avoid claiming current SEC compliance.',
  },
]

for (const check of requiredEvidence) {
  if (!check.ok) issues.push(check.message)
}

if (issues.length) {
  console.error('legal claims validation failed')
  for (const issue of issues) console.error(`- ${issue}`)
  process.exit(1)
}

console.log('legal claims validation passed')
