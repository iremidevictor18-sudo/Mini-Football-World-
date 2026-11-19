import * as THREE from 'three';
import type { KitDesign, BallDesign } from '../game/types';

export function createPitchTexture(
  maxAnisotropy: number,
  stripeA = '#1C9A4C',
  stripeB = '#22AA55',
  centerRingColor?: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1536;
  const ctx = canvas.getContext('2d')!;

  // Base alternating mowed emerald grass bands
  const bands = 14;
  const bandH = canvas.height / bands;
  for (let i = 0; i < bands; i++) {
    ctx.fillStyle = i % 2 === 0 ? stripeA : stripeB;
    ctx.fillRect(0, i * bandH, canvas.width, bandH + 1);
  }

  // Subtle turf grain blades
  ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
  for (let i = 0; i < 6000; i++) {
    const gx = (i * 197) % canvas.width;
    const gy = (i * 433) % canvas.height;
    ctx.fillRect(gx, gy, 2, 4);
  }

  // Crisp white pitch lines
  const padX = 56;
  const padY = 56;
  const w = canvas.width - padX * 2;
  const h = canvas.height - padY * 2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.lineWidth = 8;

  // Outer boundary
  ctx.strokeRect(padX, padY, w, h);

  // Halfway line
  ctx.beginPath();
  ctx.moveTo(padX, canvas.height / 2);
  ctx.lineTo(padX + w, canvas.height / 2);
  ctx.stroke();

  // Center circle & spot
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, 118, 0, Math.PI * 2);
  ctx.stroke();
  if (centerRingColor) {
    ctx.strokeStyle = centerRingColor;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 92, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.lineWidth = 8;
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, 10, 0, Math.PI * 2);
  ctx.fill();

  // Top & Bottom Penalty Boxes
  const penW = 420;
  const penH = 210;
  ctx.strokeRect(canvas.width / 2 - penW / 2, padY, penW, penH);
  ctx.strokeRect(canvas.width / 2 - penW / 2, padY + h - penH, penW, penH);

  // Six-yard boxes
  const sixW = 210;
  const sixH = 82;
  ctx.strokeRect(canvas.width / 2 - sixW / 2, padY, sixW, sixH);
  ctx.strokeRect(canvas.width / 2 - sixW / 2, padY + h - sixH, sixW, sixH);

  // Penalty arcs
  ctx.beginPath();
  ctx.arc(canvas.width / 2, padY + 145, 95, 0.23 * Math.PI, 0.77 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(canvas.width / 2, padY + h - 145, 95, 1.23 * Math.PI, 1.77 * Math.PI);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createGrassBumpTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3200; i++) {
    const shade = 100 + ((i * 37) % 60);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect((i * 73) % 256, (i * 139) % 256, 2, 3);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 20);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createJerseyTexture(kit: Pick<KitDesign, 'primary' | 'secondary' | 'pattern'>, playerNumber: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = kit.primary;
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = kit.secondary;
  if (kit.pattern === 'stripes') {
    for (let x = 16; x < 256; x += 48) {
      ctx.fillRect(x, 0, 20, 256);
    }
  } else if (kit.pattern === 'hoops') {
    for (let y = 24; y < 256; y += 52) {
      ctx.fillRect(0, y, 256, 24);
    }
  } else if (kit.pattern === 'sash') {
    ctx.beginPath();
    ctx.moveTo(0, 210);
    ctx.lineTo(210, 0);
    ctx.lineTo(256, 0);
    ctx.lineTo(256, 46);
    ctx.lineTo(46, 256);
    ctx.lineTo(0, 256);
    ctx.closePath();
    ctx.fill();
  } else if (kit.pattern === 'chevron') {
    ctx.beginPath();
    ctx.moveTo(0, 75);
    ctx.lineTo(128, 145);
    ctx.lineTo(256, 75);
    ctx.lineTo(256, 118);
    ctx.lineTo(128, 188);
    ctx.lineTo(0, 118);
    ctx.closePath();
    ctx.fill();
  }

  // Collar band
  ctx.fillStyle = kit.secondary;
  ctx.fillRect(0, 0, 256, 18);

  // Back number badge (drawn on back half of cylinder UV)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
  ctx.beginPath();
  ctx.arc(192, 132, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 42px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(playerNumber), 192, 134);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createBallTexture(ball: BallDesign): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = ball.primary;
  ctx.fillRect(0, 0, 256, 128);

  // Stylized arcade pentagon patches
  ctx.fillStyle = ball.secondary;
  const centers = [
    [32, 32], [96, 32], [160, 32], [224, 32],
    [64, 96], [128, 96], [192, 96],
  ];
  for (const [cx, cy] of centers) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const ang = (i * Math.PI * 2) / 5 - Math.PI / 2;
      const px = cx + Math.cos(ang) * 18;
      const py = cy + Math.sin(ang) * 18;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  // Accent seam stripe
  ctx.strokeStyle = ball.accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 64);
  ctx.lineTo(256, 64);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
  grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.22)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createAdBoardTexture(label: string, bg: string, fg: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 96);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 500, 84);
  ctx.fillStyle = fg;
  ctx.font = '800 44px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 256, 50);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
