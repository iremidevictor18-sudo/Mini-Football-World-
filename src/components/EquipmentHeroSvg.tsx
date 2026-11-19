import React from 'react';
import type { BallDesign, BootDesign, KitDesign, PlayerCard, ShortsDesign, SocksDesign } from '../game/types';

interface EquipmentHeroPlayerProps {
  kit: KitDesign;
  shorts: ShortsDesign;
  socks: SocksDesign;
  boot: BootDesign;
  ball: BallDesign;
  captainCard?: PlayerCard;
  jerseyNumber?: number;
  className?: string;
}

export const EquipmentHeroPlayerSvg: React.FC<EquipmentHeroPlayerProps> = ({
  kit,
  shorts,
  socks,
  boot,
  ball,
  captainCard,
  jerseyNumber = 3,
  className = 'h-72 w-56 sm:h-80 sm:w-64',
}) => {
  const skin = captainCard?.skinTone || '#E8B38F';
  const skinShadow = '#C58A66';
  const hair = captainCard?.hairColor || '#14151A';
  const uid = React.useId().replace(/:/g, '');
  const clipId = `hero-jersey-${uid}`;

  return (
    <svg viewBox="0 0 240 310" className={className} aria-label="Equipped Kit Player Showcase">
      <defs>
        <clipPath id={clipId}>
          <path d="M84 114 L103 108 L137 108 L156 114 L173 128 L161 149 L147 141 L143 185 L97 185 L93 141 L79 149 L67 128 Z" />
        </clipPath>
        <linearGradient id={`skin-grad-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={skin} />
          <stop offset="100%" stopColor={skinShadow} />
        </linearGradient>
      </defs>

      {/* Soft ground shadow */}
      <ellipse cx="122" cy="288" rx="64" ry="12" fill="rgba(5, 10, 38, 0.55)" />

      {/* Left standing leg & sock (planted) */}
      <path d="M126 206 L141 206 L139 258 L124 258 Z" fill={skinShadow} />
      <path d="M124 224 L141 224 L139 258 L124 258 Z" fill={socks.primary} stroke="#0B132B" strokeWidth="1.4" />
      <rect x="124" y="226" width="17" height="3.2" fill={socks.stripe} />
      <rect x="124" y="232" width="17" height="2.6" fill={socks.stripe} />

      {/* Right planted boot */}
      <path
        d="M121 255 L141 255 L144 274 C144 279 138 282 126 282 C117 282 114 278 116 271 Z"
        fill={boot.primary}
        stroke="#0A0F24"
        strokeWidth="1.6"
      />
      <path d="M116 277 C124 281 137 281 143 276 L143 280 C135 284 122 284 115 280 Z" fill={boot.sole} />
      <circle cx="121" cy="282" r="1.8" fill={boot.sole} />
      <circle cx="131" cy="283" r="1.8" fill={boot.sole} />
      <circle cx="140" cy="281" r="1.8" fill={boot.sole} />

      {/* Equipped Match Ball under lifted foot */}
      <g transform="translate(88, 256)">
        <circle cx="0" cy="0" r="24" fill={ball.primary} stroke="#0B132B" strokeWidth="1.8" />
        <path d="M-24 0 A24 24 0 0 0 24 0 A24 17 0 0 1 -24 0 Z" fill="rgba(15, 23, 42, 0.16)" />
        <polygon points="0,-9 8,-3 5,7 -5,7 -8,-3" fill={ball.secondary} />
        <polygon points="-18,-10 -12,-18 -4,-15 -8,-6 -16,-4" fill={ball.secondary} />
        <polygon points="18,-10 12,-18 4,-15 8,-6 16,-4" fill={ball.secondary} />
        <polygon points="-17,11 -11,19 -4,15 -7,8 -15,8" fill={ball.secondary} />
        <polygon points="17,11 11,19 4,15 7,8 15,8" fill={ball.secondary} />
        <path d="M0,-9 V-23 M8,-3 L22,-6 M-8,-3 L-22,-6 M5,7 L12,20 M-5,7 L-12,20" stroke={ball.accent} strokeWidth="1.3" opacity="0.85" />
        <ellipse cx="-8" cy="-10" rx="6" ry="3.5" transform="rotate(-25 -8 -10)" fill="#FFFFFF" opacity="0.45" />
      </g>

      {/* Left raised leg (foot resting on ball) */}
      <path d="M98 198 L118 205 L102 232 L85 224 Z" fill={skin} />
      <path d="M84 214 L103 221 L95 239 L78 232 Z" fill={socks.primary} stroke="#0B132B" strokeWidth="1.4" />
      <polygon points="84,215 102,222 100,225 82,218" fill={socks.stripe} />
      <polygon points="81,221 99,228 98,230 80,223" fill={socks.stripe} />
      {/* Lifted Boot on top of ball */}
      <path
        d="M75 230 L96 235 L95 245 C92 249 77 248 67 245 C61 243 62 236 69 233 Z"
        fill={boot.primary}
        stroke="#0A0F24"
        strokeWidth="1.6"
      />
      <path d="M64 242 C75 247 88 247 95 243 L94 246 C85 250 72 249 63 245 Z" fill={boot.sole} />

      {/* Shorts */}
      <path
        d="M95 178 L145 178 L149 212 L123 212 L119 198 L113 216 L84 205 Z"
        fill={shorts.primary}
        stroke="#0B132B"
        strokeWidth="1.8"
      />
      {/* Shorts accent side stripe */}
      <path d="M95 180 L86 205 L91 207 L99 182 Z" fill={shorts.accent} opacity="0.9" />
      <path d="M142 180 L146 211 L142 211 L138 180 Z" fill={shorts.accent} opacity="0.9" />

      {/* Right Arm (relaxed on left side of canvas) */}
      <path d="M77 142 L67 166 L78 175 L89 152 Z" fill={`url(#skin-grad-${uid})`} stroke="#0B132B" strokeWidth="1.2" />
      <circle cx="72" cy="173" r="7.5" fill={skin} stroke="#0B132B" strokeWidth="1.2" />

      {/* Left Arm (raised heroically on right side of canvas like mascot) */}
      <path d="M159 138 L178 145 L186 118 L171 114 L166 130 L155 127 Z" fill={`url(#skin-grad-${uid})`} stroke="#0B132B" strokeWidth="1.2" />
      <circle cx="179" cy="112" r="8.5" fill={skin} stroke="#0B132B" strokeWidth="1.2" />

      {/* Jersey Torso & Sleeves */}
      <g clipPath={`url(#${clipId})`}>
        <rect x="65" y="106" width="110" height="84" fill={kit.primary} />
        {kit.pattern === 'stripes' && (
          <>
            <rect x="86" y="106" width="10" height="84" fill={kit.secondary} />
            <rect x="106" y="106" width="10" height="84" fill={kit.secondary} />
            <rect x="126" y="106" width="10" height="84" fill={kit.secondary} />
            <rect x="146" y="106" width="10" height="84" fill={kit.secondary} />
          </>
        )}
        {kit.pattern === 'hoops' && (
          <>
            <rect x="65" y="122" width="110" height="9" fill={kit.secondary} />
            <rect x="65" y="142" width="110" height="9" fill={kit.secondary} />
            <rect x="65" y="162" width="110" height="9" fill={kit.secondary} />
          </>
        )}
        {kit.pattern === 'sash' && (
          <polygon points="78,106 102,106 158,188 134,188" fill={kit.secondary} />
        )}
        {kit.pattern === 'chevron' && (
          <polygon points="88,125 120,147 152,125 152,141 120,163 88,141" fill={kit.secondary} />
        )}
        {/* Side shadow sculpting */}
        <path d="M94 140 L102 185 L95 185 Z" fill="#0F172A" opacity="0.22" />
        <path d="M146 140 L138 185 L145 185 Z" fill="#0F172A" opacity="0.22" />
        {/* Sleeve bands */}
        <rect x="67" y="133" width="24" height="6" transform="rotate(-30 78 136)" fill={kit.secondary} />
        <rect x="150" y="133" width="24" height="6" transform="rotate(30 162 136)" fill={kit.secondary} />
      </g>
      <path
        d="M84 114 L103 108 L137 108 L156 114 L173 128 L161 149 L147 141 L143 185 L97 185 L93 141 L79 149 L67 128 Z"
        fill="none"
        stroke="#0B132B"
        strokeWidth="2"
      />
      {/* Jersey Collar */}
      <path d="M104 108 Q120 123 136 108 L132 115 Q120 126 108 115 Z" fill={kit.secondary} stroke="#0B132B" strokeWidth="1.2" />

      {/* Jersey Chest Number */}
      <text
        x="119"
        y="157"
        textAnchor="middle"
        fontSize="24"
        fontWeight="900"
        fill="#FFFFFF"
        stroke="#0B132B"
        strokeWidth="3.2"
        paintOrder="stroke"
        style={{ fontFamily: 'Oswald, Teko, sans-serif' }}
      >
        {jerseyNumber}
      </text>

      {/* Neck */}
      <rect x="110" y="92" width="20" height="20" rx="8" fill={skinShadow} />

      {/* Stylized Chibi Head (3/4 heroic pose) */}
      <g>
        {/* Ears */}
        <ellipse cx="90" cy="64" rx="5.5" ry="8.5" fill={skinShadow} stroke="#0B132B" strokeWidth="1.2" />
        <ellipse cx="151" cy="64" rx="6.5" ry="9.5" fill={skin} stroke="#0B132B" strokeWidth="1.2" />
        {/* Face contour */}
        <path
          d="M92 48 C92 26 148 26 148 52 C148 76 139 95 120 97 C101 95 92 78 92 48 Z"
          fill={`url(#skin-grad-${uid})`}
          stroke="#0B132B"
          strokeWidth="1.8"
        />
        {/* Sculpted Hair */}
        <path
          d="M89 56 C86 30 98 14 123 14 C143 14 156 26 151 54 C147 41 141 37 132 37 C115 37 101 40 94 56 Z"
          fill={hair}
          stroke="#0B132B"
          strokeWidth="1.6"
        />
        {/* Swept pompadour crest */}
        <path d="M97 24 C112 9 141 10 148 27 C137 22 117 21 97 24 Z" fill={hair} />
        {/* Expressive Brows */}
        <path d="M99 52 Q107 48 114 52" fill="none" stroke="#18120E" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M123 52 Q132 48 140 52" fill="none" stroke="#18120E" strokeWidth="3.2" strokeLinecap="round" />
        {/* Eyes */}
        <ellipse cx="107" cy="60" rx="5.2" ry="3.8" fill="#FFFFFF" />
        <circle cx="106.5" cy="60" r="2.7" fill="#1E293B" />
        <circle cx="105.5" cy="59" r="0.9" fill="#FFFFFF" />
        <ellipse cx="131" cy="60" rx="5.5" ry="3.8" fill="#FFFFFF" />
        <circle cx="130" cy="60" r="2.8" fill="#1E293B" />
        <circle cx="129" cy="59" r="0.9" fill="#FFFFFF" />
        {/* Nose & Confident Smirk */}
        <path d="M116 61 L113 72 L119 73" fill="none" stroke={skinShadow} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M110 81 Q118 85 127 81" fill="none" stroke="#8A4B38" strokeWidth="2.4" strokeLinecap="round" />
      </g>
    </svg>
  );
};

export const KitCardItemSvg: React.FC<{ kit: KitDesign; className?: string }> = ({ kit, className = 'h-16 w-16' }) => {
  const uid = React.useId().replace(/:/g, '');
  const clipId = `kit-tile-${uid}`;
  return (
    <svg viewBox="0 0 80 78" className={className} aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <path d="M22 14 L32 10 L48 10 L58 14 L73 25 L66 40 L57 35 L55 70 L25 70 L23 35 L14 40 L7 25 Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect x="6" y="8" width="68" height="64" fill={kit.primary} />
        {kit.pattern === 'stripes' && (
          <>
            <rect x="25" y="8" width="7" height="64" fill={kit.secondary} />
            <rect x="37" y="8" width="7" height="64" fill={kit.secondary} />
            <rect x="49" y="8" width="7" height="64" fill={kit.secondary} />
          </>
        )}
        {kit.pattern === 'hoops' && (
          <>
            <rect x="6" y="25" width="68" height="6" fill={kit.secondary} />
            <rect x="6" y="38" width="68" height="6" fill={kit.secondary} />
            <rect x="6" y="51" width="68" height="6" fill={kit.secondary} />
          </>
        )}
        {kit.pattern === 'sash' && <polygon points="18,8 31,8 62,72 49,72" fill={kit.secondary} />}
        {kit.pattern === 'chevron' && (
          <polygon points="22,25 40,39 58,25 58,34 40,48 22,34" fill={kit.secondary} />
        )}
        {/* Sleeve trim */}
        <rect x="8" y="31" width="16" height="5" transform="rotate(-28 15 33)" fill={kit.secondary} />
        <rect x="56" y="31" width="16" height="5" transform="rotate(28 65 33)" fill={kit.secondary} />
        {/* 3D torso shading */}
        <path d="M55 12 L73 25 L66 40 L57 35 L55 70 L46 70 L46 12 Z" fill="rgba(15, 23, 42, 0.16)" />
      </g>
      <path
        d="M22 14 L32 10 L48 10 L58 14 L73 25 L66 40 L57 35 L55 70 L25 70 L23 35 L14 40 L7 25 Z"
        fill="none"
        stroke="#0A1128"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M32 10 Q40 20 48 10" fill={kit.secondary} stroke="#0A1128" strokeWidth="1.8" />
    </svg>
  );
};

export const ShortsCardItemSvg: React.FC<{ shorts: ShortsDesign; className?: string }> = ({
  shorts,
  className = 'h-16 w-16',
}) => (
  <svg viewBox="0 0 80 78" className={className} aria-hidden="true">
    <path
      d="M20 14 L60 14 L66 60 L43 60 L40 43 L37 60 L14 60 Z"
      fill={shorts.primary}
      stroke="#0A1128"
      strokeWidth="2.4"
      strokeLinejoin="round"
    />
    <rect x="20" y="14" width="40" height="7" fill={shorts.accent} opacity="0.92" />
    <path d="M20 22 L15 59 L20 59 L24 22 Z" fill={shorts.accent} />
    <path d="M56 22 L61 59 L65 59 L60 22 Z" fill={shorts.accent} />
    <path d="M40 14 L60 14 L66 60 L43 60 L40 43 Z" fill="rgba(15, 23, 42, 0.14)" />
  </svg>
);

export const SocksCardItemSvg: React.FC<{ socks: SocksDesign; className?: string }> = ({
  socks,
  className = 'h-16 w-16',
}) => (
  <svg viewBox="0 0 80 78" className={className} aria-hidden="true">
    {/* Back sock */}
    <path
      d="M34 12 L48 12 L48 48 L59 56 C62 59 60 66 54 66 L36 66 Z"
      fill={socks.primary}
      stroke="#0A1128"
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    <rect x="34" y="17" width="14" height="4" fill={socks.stripe} />
    <rect x="34" y="23" width="14" height="3" fill={socks.stripe} />
    {/* Front sock */}
    <path
      d="M21 16 L35 16 L35 50 L46 58 C49 61 47 68 41 68 L23 68 Z"
      fill={socks.primary}
      stroke="#0A1128"
      strokeWidth="2.4"
      strokeLinejoin="round"
    />
    <rect x="21" y="21" width="14" height="4" fill={socks.stripe} />
    <rect x="21" y="27" width="14" height="3" fill={socks.stripe} />
  </svg>
);

export const BallCardItemSvg: React.FC<{ ball: BallDesign; className?: string }> = ({
  ball,
  className = 'h-16 w-16',
}) => (
  <svg viewBox="0 0 80 78" className={className} aria-hidden="true">
    <circle cx="40" cy="39" r="25" fill={ball.primary} stroke="#0A1128" strokeWidth="2.4" />
    <path d="M16 39 A24 24 0 0 0 64 39 A24 16 0 0 1 16 39 Z" fill="rgba(15,23,42,0.16)" />
    <polygon points="40,28 49,35 45,46 35,46 31,35" fill={ball.secondary} />
    <polygon points="21,28 28,19 36,22 31,32 23,34" fill={ball.secondary} />
    <polygon points="59,28 52,19 44,22 49,32 57,34" fill={ball.secondary} />
    <polygon points="23,50 29,59 36,55 33,47 25,47" fill={ball.secondary} />
    <polygon points="57,50 51,59 44,55 47,47 55,47" fill={ball.secondary} />
    <path d="M40,28 V14 M49,35 L63,31 M31,35 L17,31 M45,46 L52,59 M35,46 L28,59" stroke={ball.accent} strokeWidth="1.8" />
    <ellipse cx="32" cy="25" rx="6" ry="3.2" transform="rotate(-24 32 25)" fill="#FFFFFF" opacity="0.5" />
  </svg>
);

export const BootCardItemSvg: React.FC<{ boot: BootDesign; className?: string }> = ({
  boot,
  className = 'h-16 w-16',
}) => (
  <svg viewBox="0 0 80 78" className={className} aria-hidden="true">
    <path
      d="M14 26 L28 24 L37 36 C47 41 61 42 66 49 C68 54 63 59 53 59 L14 59 Z"
      fill={boot.primary}
      stroke="#0A1128"
      strokeWidth="2.3"
      strokeLinejoin="round"
    />
    {/* Accent stripe */}
    <path d="M23 41 C35 44 48 45 58 49 L55 53 C44 49 33 48 21 46 Z" fill={boot.sole} />
    {/* Studded sole */}
    <rect x="14" y="55" width="50" height="5" rx="2" fill={boot.sole} stroke="#0A1128" strokeWidth="1.5" />
    <circle cx="20" cy="62" r="2.2" fill={boot.sole} />
    <circle cx="31" cy="62" r="2.2" fill={boot.sole} />
    <circle cx="48" cy="62" r="2.2" fill={boot.sole} />
    <circle cx="58" cy="62" r="2.2" fill={boot.sole} />
  </svg>
);
