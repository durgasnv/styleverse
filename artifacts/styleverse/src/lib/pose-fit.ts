import '@tensorflow/tfjs-backend-webgl';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import type { Product } from '@/data/mock-data';

export type GarmentSlot = 'top' | 'bottom' | 'footwear' | 'accessory' | 'outerwear' | 'dress';

export interface Box {
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
}

interface Keypoint {
  x: number;
  y: number;
  score?: number;
  name?: string;
}

const MIN_SCORE = 0.3;

let detectorPromise: Promise<poseDetection.PoseDetector> | null = null;

function loadDetector(): Promise<poseDetection.PoseDetector> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      await tf.ready();
      return poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      });
    })();
  }
  return detectorPromise;
}

export async function detectPose(imgEl: HTMLImageElement): Promise<Keypoint[] | null> {
  try {
    const detector = await loadDetector();
    const poses = await detector.estimatePoses(imgEl);
    if (!poses.length) return null;
    return poses[0].keypoints as Keypoint[];
  } catch {
    return null;
  }
}

function findKeypoint(keypoints: Keypoint[], name: string): Keypoint | null {
  const kp = keypoints.find((k) => k.name === name);
  if (!kp || (kp.score ?? 0) < MIN_SCORE) return null;
  return kp;
}

export function classifyGarmentSlot(product: Product): GarmentSlot {
  if (product.category === 'Footwear') return 'footwear';
  if (product.category === 'Accessories') return 'accessory';
  const sub = product.subcategory.toLowerCase();
  if (sub.includes('dress')) return 'dress';
  if (sub.includes('jacket') || sub.includes('blazer') || sub.includes('coat')) return 'outerwear';
  if (
    sub.includes('jean') ||
    sub.includes('trouser') ||
    sub.includes('pant') ||
    sub.includes('skirt') ||
    sub.includes('short')
  ) {
    return 'bottom';
  }
  return 'top';
}

const FALLBACK_BOXES: Record<GarmentSlot, Box> = {
  top: { leftPct: 30, topPct: 20, widthPct: 40, heightPct: 30 },
  outerwear: { leftPct: 27, topPct: 18, widthPct: 46, heightPct: 32 },
  bottom: { leftPct: 28, topPct: 45, widthPct: 44, heightPct: 35 },
  dress: { leftPct: 28, topPct: 20, widthPct: 44, heightPct: 60 },
  footwear: { leftPct: 35, topPct: 82, widthPct: 30, heightPct: 15 },
  accessory: { leftPct: 38, topPct: 5, widthPct: 24, heightPct: 12 },
};

function clampPct(v: number): number {
  return Math.max(0, Math.min(100, v));
}

export function computeGarmentBox(
  keypoints: Keypoint[] | null,
  slot: GarmentSlot,
  imgDims: { w: number; h: number },
): Box {
  if (!keypoints || imgDims.w === 0 || imgDims.h === 0) {
    return FALLBACK_BOXES[slot];
  }

  const toPct = (kp: Keypoint) => ({ x: (kp.x / imgDims.w) * 100, y: (kp.y / imgDims.h) * 100 });

  const leftShoulder = findKeypoint(keypoints, 'left_shoulder');
  const rightShoulder = findKeypoint(keypoints, 'right_shoulder');
  const leftHip = findKeypoint(keypoints, 'left_hip');
  const rightHip = findKeypoint(keypoints, 'right_hip');
  const leftAnkle = findKeypoint(keypoints, 'left_ankle');
  const rightAnkle = findKeypoint(keypoints, 'right_ankle');
  const nose = findKeypoint(keypoints, 'nose');

  const shoulders = leftShoulder && rightShoulder ? [toPct(leftShoulder), toPct(rightShoulder)] : null;
  const hips = leftHip && rightHip ? [toPct(leftHip), toPct(rightHip)] : null;
  const ankles = leftAnkle && rightAnkle ? [toPct(leftAnkle), toPct(rightAnkle)] : null;

  if (!shoulders && !hips) return FALLBACK_BOXES[slot];

  const shoulderSpan = shoulders ? Math.abs(shoulders[1].x - shoulders[0].x) : null;
  const shoulderCenterX = shoulders ? (shoulders[0].x + shoulders[1].x) / 2 : null;
  const shoulderTopY = shoulders ? Math.min(shoulders[0].y, shoulders[1].y) : null;
  const hipCenterX = hips ? (hips[0].x + hips[1].x) / 2 : null;
  const hipY = hips ? (hips[0].y + hips[1].y) / 2 : null;
  const ankleY = ankles ? (ankles[0].y + ankles[1].y) / 2 : null;

  switch (slot) {
    case 'top':
    case 'outerwear': {
      if (shoulderCenterX == null || shoulderTopY == null || shoulderSpan == null) return FALLBACK_BOXES[slot];
      const widthPct = shoulderSpan * (slot === 'outerwear' ? 2.0 : 1.7);
      const bottomY = hipY ?? shoulderTopY + widthPct * 1.1;
      return {
        leftPct: clampPct(shoulderCenterX - widthPct / 2),
        topPct: clampPct(shoulderTopY - widthPct * 0.08),
        widthPct: clampPct(widthPct),
        heightPct: clampPct(bottomY - shoulderTopY + widthPct * 0.08),
      };
    }
    case 'dress': {
      if (shoulderCenterX == null || shoulderTopY == null || shoulderSpan == null) return FALLBACK_BOXES[slot];
      const widthPct = shoulderSpan * 1.8;
      const bottomY = ankleY ?? (hipY != null ? hipY + (hipY - shoulderTopY) : shoulderTopY + widthPct * 2);
      return {
        leftPct: clampPct(shoulderCenterX - widthPct / 2),
        topPct: clampPct(shoulderTopY - widthPct * 0.08),
        widthPct: clampPct(widthPct),
        heightPct: clampPct(bottomY - shoulderTopY),
      };
    }
    case 'bottom': {
      if (hipCenterX == null || hipY == null) return FALLBACK_BOXES[slot];
      const hipSpan = hips ? Math.abs(hips[1].x - hips[0].x) : shoulderSpan ?? 20;
      const widthPct = hipSpan * 2.0;
      const bottomY = ankleY ?? hipY + widthPct * 1.3;
      return {
        leftPct: clampPct(hipCenterX - widthPct / 2),
        topPct: clampPct(hipY - hipSpan * 0.15),
        widthPct: clampPct(widthPct),
        heightPct: clampPct(bottomY - hipY),
      };
    }
    case 'footwear': {
      if (!ankles) return FALLBACK_BOXES[slot];
      const centerX = (ankles[0].x + ankles[1].x) / 2;
      const span = Math.abs(ankles[1].x - ankles[0].x) || 15;
      const widthPct = span * 2.2;
      return {
        leftPct: clampPct(centerX - widthPct / 2),
        topPct: clampPct((ankleY ?? 85) - 3),
        widthPct: clampPct(widthPct),
        heightPct: clampPct(12),
      };
    }
    case 'accessory': {
      if (!nose) return FALLBACK_BOXES[slot];
      const p = toPct(nose);
      return {
        leftPct: clampPct(p.x - 12),
        topPct: clampPct(p.y - 10),
        widthPct: clampPct(24),
        heightPct: clampPct(12),
      };
    }
    default:
      return FALLBACK_BOXES[slot];
  }
}
