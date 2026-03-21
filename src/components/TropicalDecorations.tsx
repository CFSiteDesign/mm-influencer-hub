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

  const fronds: [string, string][] = [
    ['M0 0 C-20 -60 -60 -120 -110 -150 C-70 -130 -30 -90 -10 -30 Z', 'hsl(135, 55%, 38%)'],
    ['M0 0 C-40 -50 -100 -100 -160 -110 C-110 -100 -60 -70 -15 -25 Z', 'hsl(140, 50%, 42%)'],
    ['M0 0 C-50 -30 -120 -60 -170 -50 C-120 -55 -60 -40 -10 -15 Z', 'hsl(145, 45%, 40%)'],
    ['M0 0 C-50 -10 -130 -10 -170 20 C-120 -5 -60 -10 -8 -5 Z', 'hsl(138, 48%, 36%)'],
    ['M0 0 C20 -60 60 -120 110 -150 C70 -130 30 -90 10 -30 Z', 'hsl(130, 50%, 35%)'],
    ['M0 0 C40 -50 100 -100 160 -110 C110 -100 60 -70 15 -25 Z', 'hsl(142, 52%, 40%)'],
    ['M0 0 C50 -30 120 -60 170 -50 C120 -55 60 -40 10 -15 Z', 'hsl(133, 48%, 38%)'],
    ['M0 0 C50 -10 130 -10 170 20 C120 -5 60 -10 8 -5 Z', 'hsl(148, 45%, 42%)'],
    ['M0 0 C-5 -70 -10 -140 5 -180 C10 -140 8 -70 3 -20 Z', 'hsl(136, 55%, 36%)'],
  ];

  return (
    <motion.div
      className={`absolute bottom-0 ${isLeft ? 'left-0' : 'right-0'}`}
      initial={{ scaleY: 0, originY: 1, originX: isLeft ? 0 : 1 }}
      animate={{ scaleY: 1 }}
      transition={{ duration: 1.5, delay, ease: [0.34, 1.56, 0.64, 1] }}
    >
      <motion.svg
        width="220"
        height="520"
        viewBox="-10 -10 220 530"
        fill="none"
        style={{ transform: isLeft ? undefined : 'scaleX(-1)' }}
      >
        {/* Trunk - curved, textured */}
        <motion.path
          d="M95 520 C90 480 85 420 80 360 C75 300 78 240 82 180 C86 140 90 110 92 90"
          stroke="hsl(30, 40%, 35%)"
          strokeWidth="20"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, delay: delay + 0.3, ease: 'easeOut' }}
        />
        {/* Trunk highlight */}
        <motion.path
          d="M95 520 C90 480 85 420 80 360 C75 300 78 240 82 180 C86 140 90 110 92 90"
          stroke="hsl(30, 45%, 45%)"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, delay: delay + 0.3, ease: 'easeOut' }}
        />
        {/* Trunk texture rings */}
        {[200, 240, 280, 320, 360, 400, 440, 480].map((y, i) => (
          <motion.ellipse
            key={i}
            cx={95 - (520 - y) * 0.03}
            cy={y}
            rx="11"
            ry="3"
            stroke="hsl(30, 30%, 28%)"
            strokeWidth="1.5"
            fill="none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: delay + 0.8 + i * 0.08 }}
          />
        ))}

        {/* Fronds / leaves - long, arching palm fronds */}
        {fronds.map(([path, color], i) => (
          <motion.g
            key={i}
            style={{ transformOrigin: '92px 90px' }}
          >
            <motion.path
              d={path}
              fill={color}
              style={{ transformOrigin: '0 0' }}
              transform="translate(92, 90)"
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, -2 + Math.random() * 4, 0, 2 - Math.random() * 4, 0] }}
              transition={{
                scale: { duration: 0.8, delay: delay + 1.1 + i * 0.1, ease: [0.34, 1.56, 0.64, 1] },
                rotate: { duration: 3.5 + Math.random() * 2, delay: delay + 2, repeat: Infinity, ease },
              }}
            />
            {/* Leaf midrib */}
            <motion.line
              x1="92" y1="90"
              x2={92 + (i < 4 ? -80 : i < 8 ? 80 : 0)}
              y2={90 + (i === 8 ? -120 : -60 - Math.random() * 30)}
              stroke="hsl(135, 40%, 30%)"
              strokeWidth="1.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.5 }}
              transition={{ delay: delay + 1.5 + i * 0.1, duration: 0.5 }}
            />
          </motion.g>
        ))}

        {/* Coconuts */}
        <motion.g
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: delay + 2.2, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <circle cx="85" cy="100" r="9" fill="hsl(25, 60%, 30%)" />
          <circle cx="98" cy="105" r="8" fill="hsl(25, 55%, 33%)" />
          <circle cx="78" cy="108" r="7" fill="hsl(25, 50%, 28%)" />
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
