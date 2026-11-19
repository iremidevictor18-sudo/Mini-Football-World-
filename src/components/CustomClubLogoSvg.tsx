import React, { useId } from 'react';
import { DEFAULT_CLUB_LOGO } from '../game/catalog';
import type {
  CustomClubLogo,
  LogoEmblemStyle,
  LogoOrnamentStyle,
  LogoPatternStyle,
  LogoShieldShape,
} from '../game/types';

function getShieldPath(shape: LogoShieldShape): string {
  switch (shape) {
    case 'crowned':
      return 'M56 54 L66 40 L84 52 L100 36 L116 52 L134 40 L144 54 V95 C144 126 100 148 100 148 C100 148 56 126 56 95 Z';
    case 'modern':
      return 'M60 44 L100 38 L140 44 L144 90 C142 122 100 149 100 149 C100 149 58 122 56 90 Z';
    case 'hexagon':
      return 'M100 38 L144 62 V114 L100 148 L56 114 V62 Z';
    case 'classic':
      return 'M60 46 Q80 54 100 42 Q120 54 140 46 L142 96 C140 126 100 148 100 148 C100 148 60 126 58 96 Z';
    case 'spiked':
      return 'M54 44 L76 48 L100 36 L124 48 L146 44 L138 98 L100 150 L62 98 Z';
    case 'heater':
    default:
      return 'M56 46 H144 V94 C144 126 100 148 100 148 C100 148 56 126 56 94 Z';
  }
}

function renderPatternShapes(style: LogoPatternStyle, fill: string): React.ReactNode {
  switch (style) {
    case 'stripes':
      return (
        <>
          <rect x="66" y="32" width="14" height="122" fill={fill} />
          <rect x="93" y="32" width="14" height="122" fill={fill} />
          <rect x="120" y="32" width="14" height="122" fill={fill} />
        </>
      );
    case 'halves':
      return <rect x="100" y="32" width="56" height="122" fill={fill} />;
    case 'sash':
      return <polygon points="40,56 64,32 162,130 138,154" fill={fill} />;
    case 'chevron':
      return (
        <>
          <polygon points="48,68 100,96 152,68 152,86 100,114 48,86" fill={fill} />
          <polygon points="48,100 100,128 152,100 152,118 100,146 48,118" fill={fill} />
        </>
      );
    case 'quarters':
      return (
        <>
          <rect x="44" y="32" width="56" height="60" fill={fill} />
          <rect x="100" y="92" width="56" height="62" fill={fill} />
        </>
      );
    case 'hoops':
    default:
      return (
        <>
          <rect x="44" y="48" width="112" height="16" fill={fill} />
          <rect x="44" y="80" width="112" height="16" fill={fill} />
          <rect x="44" y="112" width="112" height="16" fill={fill} />
        </>
      );
  }
}

function renderEmblemShapes(
  style: LogoEmblemStyle,
  color: string,
  outline = '#FFFFFF'
): React.ReactNode {
  switch (style) {
    case 'ball':
      return (
        <g>
          <circle cx="100" cy="92" r="24" fill="#FFFFFF" stroke={color} strokeWidth="4.5" />
          <polygon points="100,79 111,87 107,100 93,100 89,87" fill={color} />
          <path
            d="M100 79 V68 M111 87 L122 83 M107 100 L114 111 M93 100 L86 111 M89 87 L78 83"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      );
    case 'crown':
      return (
        <g>
          <path
            d="M73 106 L69 77 L86 90 L100 71 L114 90 L131 77 L127 106 Z"
            fill={color}
            stroke={outline}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <rect x="73" y="108" width="54" height="8" rx="3" fill={color} stroke={outline} strokeWidth="2.5" />
          <circle cx="100" cy="67" r="3.5" fill={color} stroke={outline} strokeWidth="2" />
          <circle cx="69" cy="73" r="3" fill={color} stroke={outline} strokeWidth="2" />
          <circle cx="131" cy="73" r="3" fill={color} stroke={outline} strokeWidth="2" />
        </g>
      );
    case 'wolf':
      return (
        <g>
          <path
            d="M76 68 L88 81 H112 L124 68 L128 96 L114 114 L100 121 L86 114 L72 96 Z"
            fill={color}
            stroke={outline}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <polygon points="86,91 95,94 88,98" fill={outline} />
          <polygon points="114,91 105,94 112,98" fill={outline} />
          <polygon points="96,108 104,108 100,113" fill={outline} />
        </g>
      );
    case 'bolt':
      return (
        <polygon
          points="106,62 79,97 98,97 91,124 123,87 103,87"
          fill={color}
          stroke={outline}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
      );
    case 'star':
      return (
        <polygon
          points="100,63 108,82 129,84 113,98 118,119 100,108 82,119 87,98 71,84 92,82"
          fill={color}
          stroke={outline}
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
      );
    case 'skull':
    default:
      return (
        <g>
          {/* Stylized Flames Halo */}
          <path
            d="M73 96 C66 84 70 70 81 66 C80 73 84 75 86 68 C89 58 98 54 103 61 C106 55 114 58 114 68 C120 67 126 73 125 83 C130 85 130 96 123 103 C121 90 113 78 100 78 C87 78 78 88 73 96 Z"
            fill={color}
            stroke={outline}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Skull Dome & Jaw */}
          <path
            d="M80 92 C80 78 120 78 120 92 C120 100 115 104 112 108 V118 H88 V108 C85 104 80 100 80 92 Z"
            fill={outline}
            stroke={color}
            strokeWidth="3.2"
            strokeLinejoin="round"
          />
          {/* Eyes, Nose & Teeth */}
          <ellipse cx="91" cy="94" rx="5" ry="6" fill={color} />
          <ellipse cx="109" cy="94" rx="5" ry="6" fill={color} />
          <polygon points="100,99 97,105 103,105" fill={color} />
          <line x1="94" y1="112" x2="94" y2="118" stroke={color} strokeWidth="2.5" />
          <line x1="100" y1="112" x2="100" y2="118" stroke={color} strokeWidth="2.5" />
          <line x1="106" y1="112" x2="106" y2="118" stroke={color} strokeWidth="2.5" />
        </g>
      );
  }
}

function renderOrnamentShapes(
  style: LogoOrnamentStyle,
  fill: string,
  stroke = '#0F172A'
): React.ReactNode {
  switch (style) {
    case 'wings_crown':
      return (
        <g>
          {/* Left & Right sweeping feather wings */}
          <path
            d="M64 114 C40 108 26 84 26 52 C40 66 54 74 68 78 C54 80 42 78 34 73 C44 88 55 94 67 96 C54 98 44 96 38 92 C47 104 56 110 66 111 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M136 114 C160 108 174 84 174 52 C160 66 146 74 132 78 C146 80 158 78 166 73 C156 88 145 94 133 96 C146 98 156 96 162 92 C153 104 144 110 134 111 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Small top crown */}
          <path d="M84 31 L81 17 L93 24 L100 13 L107 24 L119 17 L116 31 Z" fill={fill} stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
        </g>
      );
    case 'falcon':
      return (
        <g>
          <path
            d="M68 134 C38 118 22 72 28 32 C42 54 58 68 72 78 C56 76 42 66 36 56 C44 82 56 96 70 104 C56 102 46 94 41 86 C48 106 58 120 72 128 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M132 134 C162 118 178 72 172 32 C158 54 142 68 128 78 C144 76 158 66 164 56 C156 82 144 96 130 104 C144 102 154 94 159 86 C152 106 142 120 128 128 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </g>
      );
    case 'blades':
      return (
        <g>
          <path
            d="M62 122 C44 110 38 72 44 40 C56 58 62 76 66 94 C58 84 52 72 48 60 C50 86 56 104 64 118 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M138 122 C156 110 162 72 156 40 C144 58 138 76 134 94 C142 84 148 72 152 60 C150 86 144 104 136 118 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </g>
      );
    case 'phoenix':
      return (
        <g>
          <path
            d="M100 164 C60 156 26 118 30 58 C42 78 56 96 72 110 C56 98 44 82 38 66 C44 104 62 126 86 140 C66 132 52 116 44 98 C56 134 78 152 100 156 C122 152 144 134 156 98 C148 116 134 132 114 140 C138 126 156 104 162 66 C156 82 144 98 128 110 C144 96 158 78 170 58 C174 118 140 156 100 164 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <polygon points="100,15 103,23 111,23 105,28 107,35 100,31 93,35 95,28 89,23 97,23" fill={fill} stroke={stroke} strokeWidth="2.5" />
        </g>
      );
    case 'pillars':
      return (
        <g>
          <path
            d="M32 54 L66 64 V136 H40 V82 L28 66 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M168 54 L134 64 V136 H160 V82 L172 66 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M84 31 L81 17 L93 24 L100 13 L107 24 L119 17 L116 31 Z" fill={fill} stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
          <path
            d="M42 138 Q100 156 158 138 L152 160 Q100 176 48 160 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </g>
      );
    case 'winged_ribbon':
    default:
      return (
        <g>
          {/* Sweeping Dual Angel Wings */}
          <path
            d="M66 122 C38 112 24 80 28 36 C42 54 58 66 72 74 C54 74 40 68 32 60 C42 82 56 90 70 94 C54 96 42 92 36 86 C46 104 58 112 70 116 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M134 122 C162 112 176 80 172 36 C158 54 142 66 128 74 C146 74 160 68 168 60 C158 82 144 90 130 94 C146 96 158 92 164 86 C154 104 142 112 130 116 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Floating Crown */}
          <path d="M84 31 L80 16 L93 24 L100 12 L107 24 L120 16 L116 31 Z" fill={fill} stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
          {/* Bottom Ribbon Scroll */}
          <path
            d="M44 134 L58 144 L48 158 Q100 174 152 158 L142 144 L156 134 Q100 154 44 134 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </g>
      );
  }
}

export const CustomClubLogoSvg: React.FC<{
  logo?: CustomClubLogo;
  className?: string;
}> = ({ logo = DEFAULT_CLUB_LOGO, className = 'h-12 w-12' }) => {
  const clipId = useId();
  const shieldPath = getShieldPath(logo.shieldShape);
  const emblemOutline = logo.emblemColor === '#FFFFFF' ? '#0F172A' : '#FFFFFF';

  return (
    <svg viewBox="0 0 200 184" className={className} aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <path d={shieldPath} />
        </clipPath>
      </defs>

      {/* Outer Ornament (Behind / Wrapping Shield) */}
      {renderOrnamentShapes(logo.ornamentStyle, logo.ornamentColor, '#0F172A')}

      {/* Shield Base */}
      <path d={shieldPath} fill={logo.shieldColor} />

      {/* Clipped Pattern */}
      <g clipPath={`url(#${clipId})`}>
        {renderPatternShapes(logo.patternStyle, logo.patternColor)}
      </g>

      {/* Bold Crisp Outer Rim + Gloss Rim */}
      <path d={shieldPath} fill="none" stroke="#0F172A" strokeWidth="6" strokeLinejoin="round" />
      <path d={shieldPath} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinejoin="round" />

      {/* Center Emblem */}
      {renderEmblemShapes(logo.emblemStyle, logo.emblemColor, emblemOutline)}
    </svg>
  );
};

export const LogoLayerOptionIcon: React.FC<{
  layer: 'shield' | 'pattern' | 'emblem' | 'ornament';
  optionId: string;
  className?: string;
}> = ({ layer, optionId, className = 'h-14 w-14' }) => {
  const clipId = useId();
  if (layer === 'shield') {
    const path = getShieldPath(optionId as LogoShieldShape);
    return (
      <svg viewBox="36 22 128 140" className={className} aria-hidden="true">
        <path d={path} fill="#FFFFFF" stroke="#0F172A" strokeWidth="4" strokeLinejoin="round" />
      </svg>
    );
  }
  if (layer === 'pattern') {
    const baseShield = getShieldPath('heater');
    return (
      <svg viewBox="40 30 120 130" className={className} aria-hidden="true">
        <defs>
          <clipPath id={clipId}>
            <path d={baseShield} />
          </clipPath>
        </defs>
        <path d={baseShield} fill="#1E3A8A" />
        <g clipPath={`url(#${clipId})`}>
          {renderPatternShapes(optionId as LogoPatternStyle, '#FFFFFF')}
        </g>
        <path d={baseShield} fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinejoin="round" />
      </svg>
    );
  }
  if (layer === 'emblem') {
    return (
      <svg viewBox="56 52 88 84" className={className} aria-hidden="true">
        {renderEmblemShapes(optionId as LogoEmblemStyle, '#FFFFFF', '#0A1433')}
      </svg>
    );
  }
  return (
    <svg viewBox="16 6 168 170" className={className} aria-hidden="true">
      {renderOrnamentShapes(optionId as LogoOrnamentStyle, '#FFFFFF', '#0A1433')}
    </svg>
  );
};
