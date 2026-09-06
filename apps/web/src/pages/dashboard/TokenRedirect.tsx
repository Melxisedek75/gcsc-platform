import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { Coins, ChevronRight } from 'lucide-react';

export function TokenRedirect() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-[#F1F5F9] flex items-center justify-center mb-4">
        <Coins size={28} className="text-[#94A3B8]" />
      </div>
      <h2 className="font-outfit font-bold text-[1.5rem] text-[#0F172A] mb-2">Token Dashboard</h2>
      <p className="text-sm text-[#475569] max-w-[400px] mb-6">
        Navigate to the Token page for GCSC token management, staking, and rewards.
      </p>
      <Link
        to="/token"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-inter font-semibold text-sm transition-all hover:scale-[1.04]"
        style={{ background: 'linear-gradient(135deg, #7B2FF7 0%, #3B6BF7 100%)' }}
      >
        Go to Token Page
        <ChevronRight size={16} />
      </Link>
    </motion.div>
  );
}
