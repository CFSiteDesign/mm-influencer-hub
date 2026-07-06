import React from 'react';
import madMonkeyLogo from '@/assets/mad-monkey-logo.png';
import { motion } from 'framer-motion';

export default function TakeoverApplyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <img src={madMonkeyLogo} alt="Mad Monkey" className="h-8" />
        <span className="text-xs font-semibold text-orange-500">Creator Takeover</span>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-6 max-w-md mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="text-center space-y-4"
        >
          <h1 className="text-2xl font-bold text-foreground leading-snug">
            Creator Hub is full for July, but we will be taking applications again in August!
          </h1>
          <p className="text-muted-foreground">Check back soon.</p>
        </motion.div>
      </div>
    </div>
  );
}
