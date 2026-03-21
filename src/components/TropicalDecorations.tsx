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

/** Palm tree that grows up from the bottom, with long swaying fronds */
function PalmTree({ side, delay = 0 }: { side: 'left' | 'right'; delay?: number }) {
  const isLeft = side === 'left';

  const fronds = [
    { path: 'M0 0 Q-40 -60 -120 -140 Q-60 -110 -10 -30 Z', color: 'hsl(135, 55%, 38%)', sway: [-3, 3], dur: 4 },
    { path: 'M0 0 Q-60 -40 -155 -95 Q-90 -80 -15 -20 Z', color: 'hsl(140, 50%, 42%)', sway: [-2, 2], dur: 4.5 },
    { path: 'M0 0 Q-70 -15 -165 -30 Q-100 -35 -10 -10 Z', color: 'hsl(145, 45%, 40%)', sway: [-2, 3], dur: 5 },
    { path: 'M0 0 Q-60 10 -155 40 Q-100 15 -8 0 Z', color: 'hsl(138, 48%, 36%)', sway: [-1, 2], dur: 5.5 },
    { path: 'M0 0 Q40 -60 120 -140 Q60 -110 10 -30 Z', color: 'hsl(130, 50%, 35%)', sway: [3, -3], dur: 4.2 },
    { path: 'M0 0 Q60 -40 155 -95 Q90 -80 15 -20 Z', color: 'hsl(142, 52%, 40%)', sway: [2, -2], dur: 4.8 },
    { path: 'M0 0 Q70 -15 165 -30 Q100 -35 10 -10 Z', color: 'hsl(133, 48%, 38%)', sway: [2, -3], dur: 5.2 },
    { path: 'M0 0 Q60 10 155 40 Q100 15 8 0 Z', color: 'hsl(148, 45%, 42%)', sway: [1, -2], dur: 5.8 },
    { path: 'M0 0 Q-5 -80 5 -175 Q12 -80 3 -15 Z', color: 'hsl(136, 55%, 36%)', sway: [-1, 1], dur: 3.8 },
  ];

  return (
    <motion.div
      className={`absolute bottom-0 ${isLeft ? 'left-0' : 'right-0'}`}
      style={{ transformOrigin: isLeft ? 'bottom left' : 'bottom right' }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 1.8, delay, ease: [0.34, 1.56, 0.64, 1] }}
    >
      <svg
        width="240"
        height="550"
        viewBox="-10 -10 240 560"
        fill="none"
        style={{ transform: isLeft ? undefined : 'scaleX(-1)' }}
      >
        {/* Trunk */}
        <motion.path
          d="M100 550 Q95 450 88 370 Q80 280 84 200 Q88 150 92 100"
          stroke="hsl(30, 40%, 35%)"
          strokeWidth="22"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, delay: delay + 0.2, ease: 'easeOut' }}
        />
        {/* Trunk highlight */}
        <motion.path
          d="M100 550 Q95 450 88 370 Q80 280 84 200 Q88 150 92 100"
          stroke="hsl(30, 45%, 45%)"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, delay: delay + 0.2, ease: 'easeOut' }}
        />
        {/* Trunk rings */}
        {[220, 270, 320, 370, 420, 470, 510].map((y, i) => (
          <motion.ellipse
            key={i}
            cx={100 - (550 - y) * 0.025}
            cy={y}
            rx="12"
            ry="3"
            stroke="hsl(30, 30%, 28%)"
            strokeWidth="1.5"
            fill="none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: delay + 1 + i * 0.08 }}
          />
        ))}

        {/* Fronds */}
        {fronds.map((frond, i) => (
          <motion.path
            key={i}
            d={frond.path}
            fill={frond.color}
            transform="translate(92, 100)"
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
              rotate: [0, frond.sway[0], 0, frond.sway[1], 0],
            }}
            transition={{
              scale: { duration: 0.7, delay: delay + 1.2 + i * 0.08, ease: [0.34, 1.56, 0.64, 1] },
              opacity: { duration: 0.4, delay: delay + 1.2 + i * 0.08 },
              rotate: { duration: frond.dur, delay: delay + 2, repeat: Infinity, ease: 'easeInOut' },
            }}
            style={{ transformOrigin: '0 0' }}
          />
        ))}

        {/* Coconuts */}
        <motion.g
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: delay + 2.2, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <circle cx="86" cy="108" r="9" fill="hsl(25, 60%, 30%)" />
          <circle cx="100" cy="112" r="8" fill="hsl(25, 55%, 33%)" />
          <circle cx="78" cy="114" r="7" fill="hsl(25, 50%, 28%)" />
        </motion.g>
      </svg>
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
