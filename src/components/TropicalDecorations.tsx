import { motion, type Easing } from 'framer-motion';

const ease: Easing = 'easeInOut';

function Banana({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const d = Math.random() * 2;
  return (
    <motion.svg
      className={className}
      style={style}
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      animate={{
        y: [0, -8, 0],
        rotate: [0, 15, 0, -15, 0],
        transition: { duration: 5, delay: d, repeat: Infinity, ease },
      }}
    >
      <path
        d="M12 36C12 36 8 28 10 20C12 12 18 6 26 4C34 2 40 6 42 10C38 8 30 8 24 14C18 20 16 30 12 36Z"
        fill="hsl(45, 100%, 55%)"
        stroke="hsl(40, 80%, 40%)"
        strokeWidth="1.5"
      />
    </motion.svg>
  );
}

function MonkeyFace({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <motion.svg
      className={className}
      style={style}
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      animate={{
        y: [0, -10, 0],
        transition: { duration: 3.5, delay: 0.5, repeat: Infinity, ease },
      }}
    >
      <circle cx="12" cy="28" r="10" fill="hsl(25, 50%, 55%)" />
      <circle cx="52" cy="28" r="10" fill="hsl(25, 50%, 55%)" />
      <circle cx="12" cy="28" r="6" fill="hsl(20, 55%, 70%)" />
      <circle cx="52" cy="28" r="6" fill="hsl(20, 55%, 70%)" />
      <circle cx="32" cy="30" r="20" fill="hsl(25, 45%, 45%)" />
      <ellipse cx="32" cy="34" rx="14" ry="12" fill="hsl(30, 55%, 75%)" />
      <motion.g
        animate={{
          scaleY: [1, 0.1, 1],
          transition: { duration: 0.3, delay: 3, repeat: Infinity, repeatDelay: 4, ease },
        }}
      >
        <circle cx="26" cy="26" r="3" fill="hsl(0, 0%, 15%)" />
        <circle cx="38" cy="26" r="3" fill="hsl(0, 0%, 15%)" />
      </motion.g>
      <circle cx="27" cy="25" r="1" fill="white" />
      <circle cx="39" cy="25" r="1" fill="white" />
      <ellipse cx="29" cy="33" rx="2" ry="1.5" fill="hsl(25, 40%, 35%)" />
      <ellipse cx="35" cy="33" rx="2" ry="1.5" fill="hsl(25, 40%, 35%)" />
      <path d="M27 38 Q32 43 37 38" stroke="hsl(25, 40%, 35%)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </motion.svg>
  );
}

function Star({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <motion.svg
      className={className}
      style={style}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      animate={{
        scale: [0.8, 1.2, 0.8],
        opacity: [0.4, 1, 0.4],
        rotate: [0, 180, 360],
        transition: { duration: 3 + Math.random() * 2, delay: Math.random() * 2, repeat: Infinity, ease },
      }}
    >
      <path d="M10 0L12.5 7.5L20 10L12.5 12.5L10 20L7.5 12.5L0 10L7.5 7.5Z" fill="hsl(45, 100%, 60%)" />
    </motion.svg>
  );
}

/** Palm tree that grows up from the bottom, with swaying leaves */
function PalmTree({ side, delay = 0 }: { side: 'left' | 'right'; delay?: number }) {
  const isLeft = side === 'left';
  return (
    <motion.div
      className={`absolute bottom-0 ${isLeft ? 'left-0' : 'right-0'}`}
      initial={{ scaleY: 0, originY: 1, originX: isLeft ? 0 : 1 }}
      animate={{ scaleY: 1 }}
      transition={{ duration: 1.5, delay, ease: [0.34, 1.56, 0.64, 1] }}
    >
      <motion.svg
        width="160"
        height="420"
        viewBox="0 0 160 420"
        fill="none"
        style={{ transform: isLeft ? undefined : 'scaleX(-1)' }}
      >
        {/* Trunk */}
        <motion.path
          d="M75 420 C75 420 70 350 72 280 C74 210 80 160 82 140"
          stroke="hsl(30, 40%, 35%)"
          strokeWidth="18"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, delay: delay + 0.3, ease: 'easeOut' }}
        />
        {/* Trunk texture lines */}
        {[280, 300, 320, 340, 360, 380].map((y, i) => (
          <motion.line
            key={i}
            x1="66" y1={y} x2="86" y2={y - 3}
            stroke="hsl(30, 30%, 28%)"
            strokeWidth="2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: delay + 0.8 + i * 0.1 }}
          />
        ))}

        {/* Leaves - each springs out */}
        {/* Main top leaf */}
        <motion.path
          d="M82 140 C82 140 60 80 20 50 C40 70 55 90 60 120 Z"
          fill="hsl(135, 55%, 38%)"
          initial={{ scale: 0, originX: '82px', originY: '140px' }}
          animate={{ scale: 1, rotate: [0, -3, 0, 3, 0] }}
          transition={{
            scale: { duration: 0.8, delay: delay + 1.2, ease: [0.34, 1.56, 0.64, 1] },
            rotate: { duration: 4, delay: delay + 2, repeat: Infinity, ease },
          }}
        />
        {/* Left drooping leaf */}
        <motion.path
          d="M82 140 C82 140 40 110 10 130 C30 115 55 115 70 130 Z"
          fill="hsl(140, 50%, 42%)"
          initial={{ scale: 0, originX: '82px', originY: '140px' }}
          animate={{ scale: 1, rotate: [0, -2, 0, 2, 0] }}
          transition={{
            scale: { duration: 0.8, delay: delay + 1.4, ease: [0.34, 1.56, 0.64, 1] },
            rotate: { duration: 5, delay: delay + 2.5, repeat: Infinity, ease },
          }}
        />
        {/* Right top leaf */}
        <motion.path
          d="M82 140 C82 140 110 80 150 60 C130 80 110 100 95 125 Z"
          fill="hsl(130, 50%, 35%)"
          initial={{ scale: 0, originX: '82px', originY: '140px' }}
          animate={{ scale: 1, rotate: [0, 2, 0, -2, 0] }}
          transition={{
            scale: { duration: 0.8, delay: delay + 1.3, ease: [0.34, 1.56, 0.64, 1] },
            rotate: { duration: 4.5, delay: delay + 2.2, repeat: Infinity, ease },
          }}
        />
        {/* Right drooping leaf */}
        <motion.path
          d="M82 140 C82 140 120 120 155 145 C130 125 105 120 90 135 Z"
          fill="hsl(145, 45%, 40%)"
          initial={{ scale: 0, originX: '82px', originY: '140px' }}
          animate={{ scale: 1, rotate: [0, 3, 0, -3, 0] }}
          transition={{
            scale: { duration: 0.8, delay: delay + 1.5, ease: [0.34, 1.56, 0.64, 1] },
            rotate: { duration: 5.5, delay: delay + 2.8, repeat: Infinity, ease },
          }}
        />
        {/* Center top leaf */}
        <motion.path
          d="M82 140 C82 140 78 60 85 20 C88 60 86 100 84 130 Z"
          fill="hsl(138, 52%, 36%)"
          initial={{ scale: 0, originX: '82px', originY: '140px' }}
          animate={{ scale: 1, rotate: [0, -1, 0, 1, 0] }}
          transition={{
            scale: { duration: 0.8, delay: delay + 1.1, ease: [0.34, 1.56, 0.64, 1] },
            rotate: { duration: 3.5, delay: delay + 2, repeat: Infinity, ease },
          }}
        />
        {/* Coconuts */}
        <motion.g
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: delay + 2, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <circle cx="78" cy="148" r="8" fill="hsl(25, 60%, 30%)" />
          <circle cx="90" cy="152" r="7" fill="hsl(25, 55%, 33%)" />
          <circle cx="72" cy="155" r="6" fill="hsl(25, 50%, 28%)" />
        </motion.g>
      </motion.svg>
    </motion.div>
  );
}

export function TropicalDecorations() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      {/* Palm trees growing from bottom corners */}
      <PalmTree side="left" delay={0.2} />
      <PalmTree side="right" delay={0.6} />

      {/* Scattered bananas */}
      <Banana className="absolute top-[15%] left-[5%] opacity-60" />
      <Banana className="absolute top-[25%] right-[8%] opacity-50" />
      <Banana className="absolute bottom-[20%] left-[10%] opacity-50" />
      <Banana className="absolute bottom-[30%] right-[5%] opacity-40" />

      {/* Monkey face */}
      <MonkeyFace className="absolute top-[8%] right-[15%] opacity-70" />

      {/* Sparkle stars */}
      <Star className="absolute top-[10%] left-[20%] opacity-60" />
      <Star className="absolute top-[30%] right-[12%] opacity-50" />
      <Star className="absolute top-[50%] left-[6%] opacity-40" />
      <Star className="absolute top-[70%] right-[18%] opacity-50" />
      <Star className="absolute bottom-[8%] left-[25%] opacity-60" />
      <Star className="absolute top-[18%] right-[30%] opacity-35" />
      <Star className="absolute bottom-[25%] right-[25%] opacity-45" />
    </div>
  );
}
