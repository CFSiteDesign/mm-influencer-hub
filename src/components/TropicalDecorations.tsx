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
        width="340"
        height="600"
        viewBox="-80 -200 340 800"
        fill="none"
        style={{ transform: isLeft ? undefined : 'scaleX(-1)' }}
      >
        {/* Trunk */}
        <motion.path
          d="M100 600 Q95 500 90 400 Q84 300 86 220 Q88 160 92 100"
          stroke="hsl(30, 40%, 35%)"
          strokeWidth="22"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, delay: delay + 0.2, ease: 'easeOut' }}
        />
        <motion.path
          d="M100 600 Q95 500 90 400 Q84 300 86 220 Q88 160 92 100"
          stroke="hsl(30, 45%, 45%)"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, delay: delay + 0.2, ease: 'easeOut' }}
        />
        {/* Trunk rings */}
        {[250, 310, 370, 430, 490, 540].map((y, i) => (
          <motion.ellipse
            key={i}
            cx={100 - (600 - y) * 0.02}
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

        {/* Coconuts - rendered before fronds so fronds overlap them */}
        <motion.g
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: delay + 2.2, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <circle cx="86" cy="108" r="9" fill="hsl(25, 60%, 30%)" />
          <circle cx="100" cy="112" r="8" fill="hsl(25, 55%, 33%)" />
          <circle cx="78" cy="114" r="7" fill="hsl(25, 50%, 28%)" />
        </motion.g>

        {/* Fronds - at trunk top */}
        {fronds.map((frond, i) => (
          <motion.path
            key={i}
            d={frond.path}
            fill={frond.color}
            stroke={frond.color.replace(/\d+%\)$/, (m) => `${parseInt(m) - 8}%)`)}
            strokeWidth="0.5"
            transform="translate(92, 95)"
            initial={{ scaleX: 0, scaleY: 0 }}
            animate={{
              scaleX: 1,
              scaleY: 1,
              rotate: [0, frond.sway[0], 0, frond.sway[1], 0],
            }}
            transition={{
              scaleX: { duration: 0.7, delay: delay + 1.2 + i * 0.08, ease: [0.34, 1.56, 0.64, 1] },
              scaleY: { duration: 0.7, delay: delay + 1.2 + i * 0.08, ease: [0.34, 1.56, 0.64, 1] },
              rotate: { duration: frond.dur, delay: delay + 2, repeat: Infinity, ease: 'easeInOut' },
            }}
            style={{ transformOrigin: '92px 95px', transformBox: 'fill-box' as any }}
          />
        ))}
      </svg>
    </motion.div>
  );
}

export function TropicalDecorations() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      {/* Scattered bananas */}
      <Banana className="absolute top-[8%] left-[3%] opacity-60" />
      <Banana className="absolute top-[20%] right-[6%] opacity-50" />
      <Banana className="absolute top-[35%] left-[8%] opacity-45" />
      <Banana className="absolute top-[50%] right-[4%] opacity-55" />
      <Banana className="absolute bottom-[15%] left-[6%] opacity-50" />
      <Banana className="absolute bottom-[30%] right-[7%] opacity-40" />
      <Banana className="absolute top-[12%] right-[20%] opacity-35" />
      <Banana className="absolute bottom-[10%] right-[15%] opacity-45" />

      {/* Sparkle stars */}
      <Star className="absolute top-[5%] left-[15%] opacity-60" />
      <Star className="absolute top-[12%] right-[10%] opacity-50" />
      <Star className="absolute top-[22%] left-[25%] opacity-45" />
      <Star className="absolute top-[30%] right-[20%] opacity-55" />
      <Star className="absolute top-[42%] left-[4%] opacity-40" />
      <Star className="absolute top-[55%] right-[12%] opacity-50" />
      <Star className="absolute top-[65%] left-[18%] opacity-60" />
      <Star className="absolute top-[75%] right-[8%] opacity-45" />
      <Star className="absolute bottom-[5%] left-[30%] opacity-55" />
      <Star className="absolute bottom-[18%] right-[25%] opacity-40" />
      <Star className="absolute top-[38%] left-[12%] opacity-35" />
      <Star className="absolute bottom-[35%] right-[30%] opacity-50" />
    </div>
  );
}
