import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { DollarSign, Clock, AlertTriangle, ChevronRight, Calculator } from 'lucide-react';
import { calculateEstimate, type ProjectType, type MaterialQuality, type LaborComplexity, type EstimationResult } from './estimator';
import { formatCurrency } from './format';

export function EstimatorPanel() {
  const [projectType, setProjectType] = useState<ProjectType | ''>('');
  const [city, setCity] = useState('');
  const [sqft, setSqft] = useState('');
  const [material, setMaterial] = useState<MaterialQuality | ''>('');
  const [labor, setLabor] = useState<LaborComplexity | ''>('');
  const [result, setResult] = useState<EstimationResult | null>(null);

  const handleCalculate = () => {
    if (!projectType || !sqft || !material || !labor) return;
    const est = calculateEstimate(
      projectType as ProjectType,
      Number(sqft),
      material as MaterialQuality,
      labor as LaborComplexity
    );
    setResult(est);
  };

  const projectTypes: ProjectType[] = [
    'Kitchen Remodel',
    'Bathroom',
    'Roofing',
    'Flooring',
    'Electrical',
    'Plumbing',
    'Full Renovation',
    'New Construction',
  ];
  const materials: MaterialQuality[] = ['Basic', 'Standard', 'Premium', 'Luxury'];
  const labors: LaborComplexity[] = ['Simple', 'Moderate', 'Complex'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="space-y-6"
    >
      <div>
        <h2 className="font-outfit font-bold text-[1.5rem] text-[#0F172A]">
          Cost Estimator
        </h2>
        <p className="font-inter text-sm text-[#475569] mt-1">
          Generate accurate project cost estimates based on scope, materials, and labor
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="glass-card p-6 space-y-5">
          <h3 className="font-outfit font-semibold text-[1.0625rem] text-[#0F172A] mb-4">
            Project Details
          </h3>

          {/* Project Type */}
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-2">
              Project Type
            </label>
            <select
              value={projectType}
              onChange={(e) => setProjectType(e.target.value as ProjectType)}
              className="w-full px-4 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#7B2FF7]/30 focus:border-[#7B2FF7] transition-all appearance-none cursor-pointer"
            >
              <option value="">Select project type...</option>
              {projectTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* City/State */}
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-2">
              City / State
            </label>
            <input
              type="text"
              placeholder="e.g. Austin, TX"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#7B2FF7]/30 focus:border-[#7B2FF7] transition-all"
            />
          </div>

          {/* Square Footage */}
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-2">
              Square Footage
            </label>
            <input
              type="number"
              placeholder="e.g. 1200"
              value={sqft}
              onChange={(e) => setSqft(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#7B2FF7]/30 focus:border-[#7B2FF7] transition-all"
            />
          </div>

          {/* Material Quality */}
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-2">
              Material Quality
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {materials.map((m) => (
                <button
                  key={m}
                  onClick={() => setMaterial(m)}
                  className="px-3 py-2.5 rounded-lg border text-sm font-medium transition-all duration-200"
                  style={{
                    borderColor: material === m ? '#7B2FF7' : '#E2E8F0',
                    backgroundColor: material === m ? 'rgba(123,47,247,0.08)' : '#FFFFFF',
                    color: material === m ? '#7B2FF7' : '#475569',
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Labor Complexity */}
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-2">
              Labor Complexity
            </label>
            <div className="grid grid-cols-3 gap-2">
              {labors.map((l) => (
                <button
                  key={l}
                  onClick={() => setLabor(l)}
                  className="px-3 py-2.5 rounded-lg border text-sm font-medium transition-all duration-200"
                  style={{
                    borderColor: labor === l ? '#7B2FF7' : '#E2E8F0',
                    backgroundColor: labor === l ? 'rgba(123,47,247,0.08)' : '#FFFFFF',
                    color: labor === l ? '#7B2FF7' : '#475569',
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Calculate Button */}
          <button
            onClick={handleCalculate}
            disabled={!projectType || !sqft || !material || !labor}
            className="w-full py-3 rounded-full text-white font-inter font-semibold text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] hover:shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #7B2FF7 0%, #3B6BF7 50%, #00D4FF 100%)',
              boxShadow: projectType && sqft && material && labor ? '0 4px 20px rgba(123,47,247,0.3)' : 'none',
            }}
          >
            Calculate Estimate
          </button>
        </div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              className="space-y-5"
            >
              {/* Cost Range Card */}
              <div className="glass-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign size={18} className="text-[#7B2FF7]" />
                  <h3 className="font-outfit font-semibold text-[1.0625rem] text-[#0F172A]">
                    Estimated Cost Range
                  </h3>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-outfit font-bold text-[2.5rem] text-[#0F172A]">
                    {formatCurrency(result.lowCost)}
                  </span>
                  <span className="text-[#94A3B8] font-medium">–</span>
                  <span className="font-outfit font-bold text-[2.5rem] gradient-text">
                    {formatCurrency(result.highCost)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#475569]">
                  <Clock size={14} />
                  <span>Estimated timeline: <strong className="text-[#0F172A]">{result.timelineWeeks} weeks</strong></span>
                </div>
              </div>

              {/* Breakdown Chart */}
              <div className="glass-card p-6">
                <h3 className="font-outfit font-semibold text-[1.0625rem] text-[#0F172A] mb-4">
                  Cost Breakdown
                </h3>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={result.breakdown} layout="vertical" barSize={28}>
                      <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#0F172A', fontWeight: 500 }} axisLine={false} tickLine={false} width={90} />
                      <Tooltip
                        formatter={(value: number) => [`${value}%`, '']}
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid rgba(123,47,247,0.2)',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                        {result.breakdown.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mt-3">
                  {result.breakdown.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-[#475569]">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Factors */}
              <div className="glass-card p-6">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={16} className="text-[#F59E0B]" />
                  <h3 className="font-outfit font-semibold text-[1.0625rem] text-[#0F172A]">
                    Risk Factors
                  </h3>
                </div>
                <ul className="space-y-2">
                  {result.risks.map((risk, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#475569]">
                      <ChevronRight size={14} className="text-[#7B2FF7] mt-0.5 shrink-0" />
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}

          {!result && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card p-6 flex flex-col items-center justify-center min-h-[400px] text-center"
            >
              <div className="w-16 h-16 rounded-full bg-[#F1F5F9] flex items-center justify-center mb-4">
                <Calculator size={28} className="text-[#94A3B8]" />
              </div>
              <h3 className="font-outfit font-semibold text-[#0F172A] mb-1">
                Ready to Estimate
              </h3>
              <p className="text-sm text-[#94A3B8] max-w-[280px]">
                Fill in the project details and click Calculate to generate a cost breakdown.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
