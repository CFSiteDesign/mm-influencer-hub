import { motion, type Easing } from 'framer-motion';

const ease: Easing = 'easeInOut';

const floatAnimation = (delay: number, duration: number, y: number) => ({
  y: [0, y, 0],
  transition: { duration, delay, repeat: Infinity, ease },
});

const rotateAnimation = (delay: number, duration: number, deg: number) => ({
  rotate: [0, deg, 0, -deg, 0],
  transition: { duration, delay, repeat: Infinity, ease },
});

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
      <path
        d="M26 4C26 4 28 8 24 14C20 20 16 30 12 36"
        stroke="hsl(40, 80%, 40%)"
        strokeWidth="1"
        fill="none"
        strokeDasharray="3 3"
      />
    </motion.svg>
  );
}

function PalmLeaf({ className, style, flip }: { className?: string; style?: React.CSSProperties; flip?: boolean }) {
  return (
    <motion.svg
      className={className}
      style={{ ...style, transform: flip ? 'scaleX(-1)' : undefined }}
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      animate={{
        y: [0, -6, 0],
        transition: { duration: 6, delay: Math.random() * 3, repeat: Infinity, ease },
      }}
    >
      <path
        d="M40 70C40 70 20 50 10 35C0 20 5 8 15 4C25 0 35 5 38 12C30 8 22 12 18 22C14 32 20 48 40 70Z"
        fill="hsl(140, 55%, 42%)"
        opacity="0.8"
      />
      <path
        d="M40 70C40 70 35 45 32 30C29 15 35 5 40 4"
        stroke="hsl(140, 40%, 30%)"
        strokeWidth="1.5"
        fill="none"
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
      <path
        d="M27 38 Q32 43 37 38"
        stroke="hsl(25, 40%, 35%)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
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
        transition: {
          duration: 3 + Math.random() * 2,
          delay: Math.random() * 2,
          repeat: Infinity,
          ease,
        },
      }}
    >
      <path
        d="M10 0L12.5 7.5L20 10L12.5 12.5L10 20L7.5 12.5L0 10L7.5 7.5Z"
        fill="hsl(45, 100%, 60%)"
      />
    </motion.svg>
  );
}

export function TropicalDecorations() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <PalmLeaf className="absolute -top-2 -left-6 opacity-60" />
      <PalmLeaf className="absolute -top-4 -right-8 opacity-50" flip />
      <Banana className="absolute top-16 -left-4 opacity-70" />
      <Banana className="absolute bottom-24 -right-2 opacity-60" />
      <Banana className="absolute top-1/3 -right-6 opacity-50" />
      <MonkeyFace className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-90" />
      <Star className="absolute top-20 right-6 opacity-70" />
      <Star className="absolute bottom-32 left-4 opacity-60" />
      <Star className="absolute top-1/2 -left-2 opacity-50" />
      <Star className="absolute top-12 left-12 opacity-40" />
      <Star className="absolute bottom-16 right-10 opacity-50" />
    </div>
  );
}
