import * as THREE from 'three';
import type { BootDesign, CelebrationId, KitDesign, PlayerCard } from '../game/types';
import type { SimPlayer } from '../game/physics';
import { createJerseyTexture } from './textures';

export interface ChibiRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  selectionRing: THREE.Mesh;
  staminaArcMesh: THREE.Mesh;
  staminaMat: THREE.MeshBasicMaterial;
  flairHalo: THREE.Mesh;
  jerseyMat: THREE.MeshStandardMaterial;
  disposables: Array<{ dispose: () => void }>;
}

export function buildChibiPlayerRig(
  card: PlayerCard,
  kit: Pick<KitDesign, 'primary' | 'secondary' | 'shorts' | 'socks' | 'pattern'>,
  boot: Pick<BootDesign, 'primary' | 'sole'>,
  shadowTex: THREE.CanvasTexture,
  isGK: boolean
): ChibiRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const disposables: Array<{ dispose: () => void }> = [];

  // 1. Grounded radial contact shadow disc (y = 0.015)
  const shadowGeo = new THREE.CircleGeometry(0.68, 24);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.015;
  root.add(shadowMesh);
  disposables.push(shadowGeo, shadowMat);

  // 2. Active player selection ring & on-pitch stamina arc (visible for controlled player)
  const ringGeo = new THREE.RingGeometry(0.76, 0.94, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const selectionRing = new THREE.Mesh(ringGeo, ringMat);
  selectionRing.rotation.x = -Math.PI / 2;
  selectionRing.position.y = 0.025;
  selectionRing.visible = false;
  root.add(selectionRing);
  disposables.push(ringGeo, ringMat);

  const stamGeo = new THREE.RingGeometry(0.98, 1.15, 28, 1, 0, Math.PI * 2);
  const staminaMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  });
  const staminaArcMesh = new THREE.Mesh(stamGeo, staminaMat);
  staminaArcMesh.rotation.x = -Math.PI / 2;
  staminaArcMesh.position.y = 0.028;
  staminaArcMesh.visible = false;
  root.add(staminaArcMesh);
  disposables.push(stamGeo, staminaMat);

  // Rarity flair ring accent for Epic/Legendary/Mythical cards
  const flairGeo = new THREE.RingGeometry(0.58, 0.72, 24);
  const flairMat = new THREE.MeshBasicMaterial({
    color: card.flairColor,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: card.rarity === 'Common' ? 0 : 0.55,
    depthWrite: false,
  });
  const flairHalo = new THREE.Mesh(flairGeo, flairMat);
  flairHalo.rotation.x = -Math.PI / 2;
  flairHalo.position.y = 0.02;
  flairHalo.visible = card.rarity !== 'Common';
  root.add(flairHalo);
  disposables.push(flairGeo, flairMat);

  // Materials with distinct roughness/metalness contrast
  const skinMat = new THREE.MeshStandardMaterial({ color: card.skinTone, roughness: 0.62, metalness: 0.02 });
  const effectiveKit = isGK
    ? { ...kit, primary: '#FDE047', secondary: '#0F172A', pattern: 'solid' as const }
    : kit;
  const jerseyTex = createJerseyTexture(effectiveKit, card.number);
  const jerseyMat = new THREE.MeshStandardMaterial({
    map: jerseyTex,
    color: 0xffffff,
    roughness: 0.85,
    metalness: 0.04,
  });
  const shortsMat = new THREE.MeshStandardMaterial({ color: effectiveKit.shorts, roughness: 0.86, metalness: 0.03 });
  const sockMat = new THREE.MeshStandardMaterial({ color: effectiveKit.socks, roughness: 0.82, metalness: 0.02 });
  const bootMat = new THREE.MeshStandardMaterial({ color: boot.primary, roughness: 0.24, metalness: 0.25 });
  const soleMat = new THREE.MeshStandardMaterial({ color: boot.sole, roughness: 0.45, metalness: 0.1 });
  const hairMat = new THREE.MeshStandardMaterial({ color: card.hairColor, roughness: 0.52, metalness: 0.08 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15, metalness: 0.1 });
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.0 });
  disposables.push(jerseyTex, skinMat, jerseyMat, shortsMat, sockMat, bootMat, soleMat, hairMat, eyeMat, eyeWhiteMat);

  // 3. Compact Chibi Torso & Shorts (Primary Silhouette)
  const torsoGeo = new THREE.CylinderGeometry(0.32, 0.36, 0.62, 12);
  const torsoMesh = new THREE.Mesh(torsoGeo, jerseyMat);
  torsoMesh.position.y = 0.92;
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  bodyGroup.add(torsoMesh);

  const shortsGeo = new THREE.CylinderGeometry(0.36, 0.34, 0.26, 12);
  const shortsMesh = new THREE.Mesh(shortsGeo, shortsMat);
  shortsMesh.position.y = 0.54;
  shortsMesh.castShadow = true;
  bodyGroup.add(shortsMesh);
  disposables.push(torsoGeo, shortsGeo);

  // 4. Short Chibi Legs + Socks + Glossy Boots (Secondary Read)
  const makeLeg = (xOffset: number): THREE.Group => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOffset, 0.48, 0);

    const thighGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.22, 10);
    const thigh = new THREE.Mesh(thighGeo, skinMat);
    thigh.position.y = -0.11;
    thigh.castShadow = true;
    legPivot.add(thigh);

    const sockGeo = new THREE.CylinderGeometry(0.105, 0.095, 0.18, 10);
    const sock = new THREE.Mesh(sockGeo, sockMat);
    sock.position.y = -0.28;
    sock.castShadow = true;
    legPivot.add(sock);

    const bootGeo = new THREE.BoxGeometry(0.2, 0.13, 0.34);
    const bootMesh = new THREE.Mesh(bootGeo, bootMat);
    bootMesh.position.set(0, -0.41, 0.07);
    bootMesh.castShadow = true;
    legPivot.add(bootMesh);

    const soleGeo = new THREE.BoxGeometry(0.21, 0.04, 0.35);
    const soleMesh = new THREE.Mesh(soleGeo, soleMat);
    soleMesh.position.set(0, -0.46, 0.07);
    legPivot.add(soleMesh);

    disposables.push(thighGeo, sockGeo, bootGeo, soleGeo);
    return legPivot;
  };

  const leftLeg = makeLeg(-0.17);
  const rightLeg = makeLeg(0.17);
  bodyGroup.add(leftLeg, rightLeg);

  // 5. Short Chibi Arms + Sleeves + Hands/GK Gloves
  const makeArm = (xOffset: number): THREE.Group => {
    const armPivot = new THREE.Group();
    armPivot.position.set(xOffset, 1.14, 0);

    const sleeveGeo = new THREE.CylinderGeometry(0.11, 0.1, 0.2, 10);
    const sleeve = new THREE.Mesh(sleeveGeo, jerseyMat);
    sleeve.position.y = -0.08;
    sleeve.castShadow = true;
    armPivot.add(sleeve);

    const forearmGeo = new THREE.CylinderGeometry(0.085, 0.075, 0.22, 10);
    const forearm = new THREE.Mesh(forearmGeo, skinMat);
    forearm.position.y = -0.24;
    forearm.castShadow = true;
    armPivot.add(forearm);

    const handGeo = new THREE.SphereGeometry(isGK ? 0.125 : 0.09, 10, 10);
    const handMat = isGK ? bootMat : skinMat;
    const hand = new THREE.Mesh(handGeo, handMat);
    hand.position.y = -0.37;
    armPivot.add(hand);

    disposables.push(sleeveGeo, forearmGeo, handGeo);
    return armPivot;
  };

  const leftArm = makeArm(-0.42);
  const rightArm = makeArm(0.42);
  bodyGroup.add(leftArm, rightArm);

  // 6. Oversized Cartoonish Chibi Head (3-6 facial/hair accent parts)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.58, 0);
  bodyGroup.add(headGroup);

  const headGeo = new THREE.SphereGeometry(0.42, 18, 16);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.scale.set(1.04, 1.0, 0.98);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Ears
  const earGeo = new THREE.SphereGeometry(0.09, 8, 8);
  const earL = new THREE.Mesh(earGeo, skinMat);
  earL.position.set(-0.41, -0.02, 0);
  const earR = new THREE.Mesh(earGeo, skinMat);
  earR.position.set(0.41, -0.02, 0);
  headGroup.add(earL, earR);

  // Expressive Eyes & Eyebrows
  const eyeWGeo = new THREE.SphereGeometry(0.08, 10, 10);
  const pupilGeo = new THREE.SphereGeometry(0.048, 8, 8);
  const browGeo = new THREE.BoxGeometry(0.13, 0.035, 0.04);

  [-0.14, 0.14].forEach((ex, idx) => {
    const ew = new THREE.Mesh(eyeWGeo, eyeWhiteMat);
    ew.position.set(ex, 0.03, 0.36);
    const pu = new THREE.Mesh(pupilGeo, eyeMat);
    pu.position.set(ex, 0.03, 0.41);
    const brow = new THREE.Mesh(browGeo, hairMat);
    brow.position.set(ex, 0.14, 0.39);
    brow.rotation.z = idx === 0 ? -0.14 : 0.14; // Determined arcade brow!
    headGroup.add(ew, pu, brow);
  });
  disposables.push(headGeo, earGeo, eyeWGeo, pupilGeo, browGeo);

  // Stylized Hairstyles (low-poly silhouettes)
  if (card.hairStyle === 'topknot') {
    const capGeo = new THREE.SphereGeometry(0.43, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.48);
    const cap = new THREE.Mesh(capGeo, hairMat);
    cap.position.y = 0.04;
    const bunGeo = new THREE.SphereGeometry(0.16, 10, 10);
    const bun = new THREE.Mesh(bunGeo, hairMat);
    bun.position.set(0, 0.5, -0.14);
    headGroup.add(cap, bun);
    disposables.push(capGeo, bunGeo);
  } else if (card.hairStyle === 'mohawk') {
    const ridgeGeo = new THREE.BoxGeometry(0.16, 0.28, 0.56);
    const ridge = new THREE.Mesh(ridgeGeo, hairMat);
    ridge.position.set(0, 0.42, 0.02);
    headGroup.add(ridge);
    disposables.push(ridgeGeo);
  } else if (card.hairStyle === 'afro') {
    const afroGeo = new THREE.DodecahedronGeometry(0.49, 1);
    const afro = new THREE.Mesh(afroGeo, hairMat);
    afro.position.set(0, 0.14, -0.05);
    headGroup.add(afro);
    disposables.push(afroGeo);
  } else if (card.hairStyle === 'flow') {
    const capGeo = new THREE.SphereGeometry(0.44, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const cap = new THREE.Mesh(capGeo, hairMat);
    cap.position.y = 0.04;
    const backFlowGeo = new THREE.BoxGeometry(0.55, 0.28, 0.22);
    const backFlow = new THREE.Mesh(backFlowGeo, hairMat);
    backFlow.position.set(0, -0.08, -0.34);
    headGroup.add(cap, backFlow);
    disposables.push(capGeo, backFlowGeo);
  } else {
    // fade or buzz
    const capGeo = new THREE.SphereGeometry(0.435, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.46);
    const cap = new THREE.Mesh(capGeo, hairMat);
    cap.position.y = 0.03;
    headGroup.add(cap);
    disposables.push(capGeo);
  }

  // Stylized Facial Hair Parody Accents
  if (card.facialHair === 'mustache') {
    const mustGeo = new THREE.BoxGeometry(0.28, 0.065, 0.08);
    const must = new THREE.Mesh(mustGeo, hairMat);
    must.position.set(0, -0.1, 0.41);
    headGroup.add(must);
    disposables.push(mustGeo);
  } else if (card.facialHair === 'beard') {
    const beardGeo = new THREE.SphereGeometry(0.39, 12, 10, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45);
    const beard = new THREE.Mesh(beardGeo, hairMat);
    beard.position.set(0, -0.03, 0.06);
    headGroup.add(beard);
    disposables.push(beardGeo);
  } else if (card.facialHair === 'goatee') {
    const goateeGeo = new THREE.ConeGeometry(0.09, 0.14, 6);
    const goatee = new THREE.Mesh(goateeGeo, hairMat);
    goatee.rotation.x = Math.PI;
    goatee.position.set(0, -0.2, 0.37);
    headGroup.add(goatee);
    disposables.push(goateeGeo);
  }

  return {
    root,
    bodyGroup,
    headGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    selectionRing,
    staminaArcMesh,
    staminaMat,
    flairHalo,
    jerseyMat,
    disposables,
  };
}

export function updateChibiRigAnimation(
  rig: ChibiRig,
  p: SimPlayer,
  isControlled: boolean,
  isCelebrating: boolean,
  celebrationId: CelebrationId,
  elapsedSec: number
): void {
  rig.root.position.set(p.x, 0, p.z);
  rig.root.rotation.y = p.facing;

  // Hit flash on heavy tackle
  if (p.hitFlashTimer > 0) {
    rig.jerseyMat.emissive.setHex(0xffffff);
    rig.jerseyMat.emissiveIntensity = 0.7;
  } else {
    rig.jerseyMat.emissive.setHex(0x000000);
    rig.jerseyMat.emissiveIntensity = 0;
  }

  // Selection ring & on-pitch stamina indicator
  rig.selectionRing.visible = isControlled;
  rig.staminaArcMesh.visible = isControlled;
  if (isControlled) {
    const ratio = Math.max(0.05, p.stamina / 100);
    rig.staminaArcMesh.scale.set(ratio, 1, ratio);
    if (p.stamina < 25) rig.staminaMat.color.setHex(0xef4444);
    else if (p.isSprinting) rig.staminaMat.color.setHex(0xfacc15);
    else rig.staminaMat.color.setHex(0x38bdf8);
  }

  // Reset local transforms
  rig.bodyGroup.position.set(0, 0, 0);
  rig.bodyGroup.rotation.set(0, 0, 0);
  rig.leftArm.rotation.set(0, 0, 0);
  rig.rightArm.rotation.set(0, 0, 0);
  rig.leftLeg.rotation.set(0, 0, 0);
  rig.rightLeg.rotation.set(0, 0, 0);

  if (isCelebrating) {
    // Exaggerated custom Goal Celebrations!
    if (celebrationId === 'backflip') {
      const cycle = (elapsedSec * 2.4) % 1;
      rig.bodyGroup.position.y = Math.sin(cycle * Math.PI) * 1.45;
      rig.bodyGroup.rotation.x = -cycle * Math.PI * 2;
      rig.leftArm.rotation.x = -2.2;
      rig.rightArm.rotation.x = -2.2;
    } else if (celebrationId === 'samba') {
      rig.bodyGroup.position.y = Math.abs(Math.sin(elapsedSec * 8)) * 0.25;
      rig.bodyGroup.rotation.y = elapsedSec * 5;
      rig.leftArm.rotation.z = 0.8 + Math.sin(elapsedSec * 12) * 0.4;
      rig.rightArm.rotation.z = -0.8 - Math.cos(elapsedSec * 12) * 0.4;
    } else if (celebrationId === 'statue') {
      rig.bodyGroup.position.y = 0.15;
      rig.leftArm.rotation.z = 1.4;
      rig.rightArm.rotation.z = -1.4;
      rig.headGroup.rotation.x = -0.25;
    } else if (celebrationId === 'airplane') {
      rig.bodyGroup.position.y = Math.abs(Math.sin(elapsedSec * 10)) * 0.2;
      rig.bodyGroup.rotation.x = 0.3;
      rig.leftArm.rotation.z = 1.55;
      rig.rightArm.rotation.z = -1.55;
      rig.leftLeg.rotation.x = Math.sin(elapsedSec * 14) * 0.7;
      rig.rightLeg.rotation.x = -Math.sin(elapsedSec * 14) * 0.7;
    } else {
      // kneeslide
      rig.bodyGroup.position.y = -0.18;
      rig.bodyGroup.rotation.x = -0.35;
      rig.leftLeg.rotation.x = 1.1;
      rig.rightLeg.rotation.x = 1.1;
      rig.leftArm.rotation.x = -1.8;
      rig.rightArm.rotation.x = -1.8;
    }
    return;
  }

  if (p.diveTimer > 0) {
    // Goalkeeper exaggerated horizontal dive!
    rig.bodyGroup.position.y = 0.55;
    rig.bodyGroup.rotation.z = p.diveDir * 1.35;
    rig.leftArm.rotation.x = -2.5;
    rig.rightArm.rotation.x = -2.5;
    return;
  }

  if (p.tackleTimer > 0) {
    // Exaggerated slide tackle pose
    rig.bodyGroup.position.y = -0.22;
    rig.bodyGroup.rotation.x = -1.05;
    rig.rightLeg.rotation.x = -0.45;
    rig.leftLeg.rotation.x = 0.35;
    rig.leftArm.rotation.z = 0.7;
    rig.rightArm.rotation.z = -0.7;
    return;
  }

  const speed = Math.hypot(p.vx, p.vz);
  if (speed > 0.35) {
    const swing = Math.sin(p.gaitPhase) * (p.isSprinting ? 0.95 : 0.65);
    rig.leftLeg.rotation.x = swing;
    rig.rightLeg.rotation.x = -swing;
    rig.leftArm.rotation.x = -swing * 0.85;
    rig.rightArm.rotation.x = swing * 0.85;
    rig.bodyGroup.position.y = Math.abs(Math.cos(p.gaitPhase)) * (p.isSprinting ? 0.14 : 0.07);
    rig.bodyGroup.rotation.x = p.isSprinting ? 0.24 : 0.1;
  } else {
    // Subtle idle breathing bounce
    rig.bodyGroup.position.y = Math.sin(elapsedSec * 3.2 + p.slotIndex) * 0.03;
    rig.headGroup.rotation.y = Math.sin(elapsedSec * 1.4 + p.slotIndex) * 0.08;
  }

  if (p.kickAnimTimer > 0) {
    const k = p.kickAnimTimer / 0.32;
    rig.rightLeg.rotation.x = -Math.sin(k * Math.PI) * 1.35;
    rig.bodyGroup.rotation.x = -0.15 * k;
  }
}
