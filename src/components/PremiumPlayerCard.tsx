import React, { useRef, useState } from 'react';
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'motion/react';
import { RARITY_COLORS } from '../game/catalog';
import type { RarityTier } from '../game/types';

interface PremiumPlayerCardProps {
  rarity: RarityTier;
  children: React.ReactNode;
  className?: string;
}

const RARITY_TILT_DEG: Record<RarityTier, number> = {
  Common: 3,
  Rare: 5.5,
  Epic: 7.5,
  Legendary: 9,
  Mythical: 10.5,
};

const RARITY_CARD_STYLES: Record<
  RarityTier,
  {
    borderClass: string;
    bgStyle: string;
    glowColor: string;
    sheenColor: string;
    foilGradient: string;
    isPremium: boolean;
  }
> = {
  Common: {
    borderClass: 'border-white/10 hover:border-slate-400/40',
    bgStyle: 'rgba(15, 23, 42, 0.9)',
    glowColor: 'rgba(148, 163, 184, 0.14)',
    sheenColor: 'rgba(255, 255, 255, 0.12)',
    foilGradient: 'linear-gradient(125deg, transparent 35%, rgba(255,255,255,0.08) 50%, transparent 65%)',
    isPremium: false,
  },
  Rare: {
    borderClass: 'border-sky-400/40 hover:border-sky-300/75',
    bgStyle: 'linear-gradient(160deg, rgba(14, 34, 62, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
    glowColor: 'rgba(56, 189, 248, 0.24)',
    sheenColor: 'rgba(125, 211, 252, 0.24)',
    foilGradient: 'linear-gradient(125deg, transparent 30%, rgba(56, 189, 248, 0.16) 50%, transparent 70%)',
    isPremium: true,
  },
  Epic: {
    borderClass: 'border-purple-400/50 hover:border-purple-300/85',
    bgStyle: 'linear-gradient(155deg, rgba(46, 20, 74, 0.95) 0%, rgba(15, 23, 42, 0.96) 100%)',
    glowColor: 'rgba(168, 85, 247, 0.3)',
    sheenColor: 'rgba(216, 180, 254, 0.28)',
    foilGradient:
      'linear-gradient(125deg, transparent 25%, rgba(168, 85, 247, 0.22) 48%, rgba(232, 121, 249, 0.14) 55%, transparent 75%)',
    isPremium: true,
  },
  Legendary: {
    borderClass: 'border-amber-400/60 hover:border-amber-300/95',
    bgStyle: 'linear-gradient(150deg, rgba(64, 42, 12, 0.95) 0%, rgba(18, 22, 36, 0.96) 100%)',
    glowColor: 'rgba(245, 158, 11, 0.36)',
    sheenColor: 'rgba(253, 224, 71, 0.34)',
    foilGradient:
      'linear-gradient(125deg, transparent 22%, rgba(250, 204, 21, 0.24) 45%, rgba(255, 255, 255, 0.2) 52%, transparent 74%)',
    isPremium: true,
  },
  Mythical: {
    borderClass: 'border-rose-400/65 hover:border-rose-300',
    bgStyle: 'linear-gradient(145deg, rgba(68, 16, 38, 0.96) 0%, rgba(26, 18, 42, 0.96) 52%, rgba(15, 23, 42, 0.98) 100%)',
    glowColor: 'rgba(244, 63, 94, 0.42)',
    sheenColor: 'rgba(253, 164, 175, 0.36)',
    foilGradient:
      'linear-gradient(125deg, transparent 18%, rgba(244, 63, 94, 0.28) 38%, rgba(250, 204, 21, 0.22) 50%, rgba(56, 189, 248, 0.2) 62%, transparent 80%)',
    isPremium: true,
  },
};

export const PremiumPlayerCard: React.FC<PremiumPlayerCardProps> = ({
  rarity,
  children,
  className = '',
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState(false);

  const styleMeta = RARITY_CARD_STYLES[rarity];
  const maxTilt = RARITY_TILT_DEG[rarity];

  const normX = useMotionValue(0);
  const normY = useMotionValue(0);

  const smoothX = useSpring(normX, { stiffness: 260, damping: 22, mass: 0.5 });
  const smoothY = useSpring(normY, { stiffness: 260, damping: 22, mass: 0.5 });

  const rotateX = useTransform(smoothY, [-0.5, 0.5], [maxTilt, -maxTilt]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-maxTilt, maxTilt]);
  const glareX = useTransform(smoothX, [-0.5, 0.5], [15, 85]);
  const glareY = useTransform(smoothY, [-0.5, 0.5], [15, 85]);
  const sweepPos = useTransform(smoothX, [-0.5, 0.5], [-60, 140]);

  const glareBackground = useMotionTemplate`radial-gradient(circle 160px at ${glareX}% ${glareY}%, ${styleMeta.sheenColor}, transparent 72%)`;
  const sweepTransform = useMotionTemplate`translateX(${sweepPos}%)`;

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const px = Math.max(-0.5, Math.min(0.5, (e.clientX - rect.left) / rect.width - 0.5));
    const py = Math.max(-0.5, Math.min(0.5, (e.clientY - rect.top) / rect.height - 0.5));
    normX.set(px);
    normY.set(py);
  };

  const handlePointerEnter = () => {
    setHovered(true);
  };

  const handlePointerLeave = () => {
    setHovered(false);
    normX.set(0);
    normY.set(0);
  };

  return (
    <div style={{ perspective: '900px' }} className="h-full">
      <motion.div
        ref={cardRef}
        data-rarity={rarity}
        data-premium-card="true"
        onPointerMove={handlePointerMove}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
          background: styleMeta.bgStyle,
          boxShadow: hovered
            ? `0 14px 32px -10px ${styleMeta.glowColor}, 0 0 0 1px ${RARITY_COLORS[rarity]}55`
            : styleMeta.isPremium
              ? `0 6px 18px -8px ${styleMeta.glowColor}`
              : undefined,
        }}
        whileHover={{
          y: styleMeta.isPremium ? -5 : -2,
          scale: styleMeta.isPremium ? 1.022 : 1.01,
        }}
        whileTap={{ scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        className={`relative flex h-full flex-col justify-between overflow-hidden rounded-xl border p-4 transition-colors duration-200 ${styleMeta.borderClass} ${className}`}
      >
        {/* Top Rarity Foil Accent Strip */}
        {styleMeta.isPremium && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-1"
            style={{
              background: `linear-gradient(90deg, transparent, ${RARITY_COLORS[rarity]}, transparent)`,
            }}
          />
        )}

        {/* Interactive Pointer-Tracked Specular Glare */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-opacity duration-200"
          style={{
            background: glareBackground,
            opacity: hovered ? 1 : styleMeta.isPremium ? 0.25 : 0,
          }}
        />

        {/* Dynamic Diagonal Foil Sweep on Tilt */}
        {styleMeta.isPremium && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 -left-1/2 w-[140%] transition-opacity duration-200"
            style={{
              background: styleMeta.foilGradient,
              transform: sweepTransform,
              opacity: hovered ? 0.9 : 0.2,
            }}
          />
        )}

        {/* Card Content */}
        <div className="relative z-10 flex h-full flex-col justify-between">{children}</div>
      </motion.div>
    </div>
  );
};
