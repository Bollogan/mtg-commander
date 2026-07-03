import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

// Card proportions: MTG cards are 63 × 88 mm ≈ 1 : 1.396, with a little thickness and the
// characteristic rounded corners (radius ≈ 2.5/63 of the width).
const W = 1;
const H = 1.396;
const D = 0.02;
const R = 0.052;
const FACE_OFFSET = D / 2 + 0.001;

// Official Magic card back (Scryfall's default card-back asset).
const BACK_URL = 'https://backs.scryfall.io/normal/0/a/0aeebaf5-8c7d-4636-9e82-8c27447861f7.jpg';

/** Centered rounded-rectangle path used for both the body silhouette and the flat faces. */
const roundedRectShape = (w: number, h: number, r: number): THREE.Shape => {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
};

/** ShapeGeometry UVs come out as raw XY; remap them to [0,1] so the card image maps correctly. */
const normalizeUv = (geo: THREE.BufferGeometry) => {
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const w = bb.max.x - bb.min.x;
  const h = bb.max.y - bb.min.y;
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) - bb.min.x) / w;
    uv[i * 2 + 1] = (pos.getY(i) - bb.min.y) / h;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
};

// Shared geometries (all cards are the same size): rounded body for silhouette + thick edge,
// and a flat rounded face for the front art / back.
const cardShape = roundedRectShape(W, H, R);
const bodyGeometry = (() => {
  const geo = new THREE.ExtrudeGeometry(cardShape, { depth: D, bevelEnabled: false, curveSegments: 12 });
  geo.translate(0, 0, -D / 2);
  return geo;
})();
const faceGeometry = (() => {
  const geo = new THREE.ShapeGeometry(cardShape, 12);
  normalizeUv(geo);
  return geo;
})();

interface CardLayout {
  fx: number; // horizontal position as a fraction of the visible half-width (-1 … 1)
  y: number; // vertical world position (half-height is ~constant across devices)
  z: number;
  spin: number;
  scrollTurns: number;
  drift: number;
  phase: number;
}

// fx keeps every card inside the frame on any aspect ratio: on wide screens they fan out to the
// sides, on a phone they pull toward the centre but all stay visible (some lower → seen on scroll).
const LAYOUTS: CardLayout[] = [
  { fx: -0.92, y: 0.7, z: 0, spin: 0.22, scrollTurns: 1.1, drift: 3.2, phase: 0 },
  { fx: 0.95, y: -0.2, z: -1, spin: -0.3, scrollTurns: -1.4, drift: 4.1, phase: 1.6 },
  { fx: -0.68, y: -1.9, z: -0.6, spin: 0.27, scrollTurns: 1.7, drift: 5.0, phase: 3.1 },
  { fx: 0.72, y: 1.7, z: -1.6, spin: -0.19, scrollTurns: 1.2, drift: 3.6, phase: 4.4 },
  { fx: 0.06, y: -2.7, z: -2.4, spin: 0.16, scrollTurns: -0.9, drift: 6.2, phase: 5.7 },
];

// Portrait/phone layout: cards are scaled down (see Scene) and stacked DOWN the page at clearly
// different heights. The centre band (y ≈ -1.3…1.3) is kept clear so cards don't hide behind the
// full-width hero copy — one sits above the text, one below, the rest lower (seen while scrolling).
const MOBILE_LAYOUTS: CardLayout[] = [
  { fx: -0.5, y: 2.05, z: 0, spin: 0.22, scrollTurns: 1.2, drift: 3.0, phase: 0 },
  { fx: 0.52, y: -2.0, z: -0.8, spin: -0.3, scrollTurns: -1.4, drift: 3.6, phase: 1.6 },
  { fx: -0.46, y: -3.7, z: -0.5, spin: 0.27, scrollTurns: 1.6, drift: 4.6, phase: 3.1 },
  { fx: 0.5, y: -5.3, z: -1.2, spin: -0.2, scrollTurns: 1.1, drift: 5.4, phase: 4.4 },
  { fx: -0.12, y: -6.9, z: -1.8, spin: 0.16, scrollTurns: -0.9, drift: 6.4, phase: 5.7 },
];

/** 0 → 1 progress down the whole document. */
const scrollFraction = (): number => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
};

interface Card3DProps {
  url: string;
  backTexture: THREE.Texture | null;
  layout: CardLayout;
  position: [number, number, number]; // resolved from the live viewport width
  scale: number;
  reduce: boolean;
}

function Card3D({ url, backTexture, layout, position, scale, reduce }: Card3DProps) {
  const group = useRef<THREE.Group>(null);
  const texture = useTexture(url) as THREE.Texture;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  const baseY = position[1];

  useFrame((state: { clock: { elapsedTime: number } }) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const scroll = scrollFraction();
    g.rotation.y = layout.phase + (reduce ? 0 : t * layout.spin) + scroll * layout.scrollTurns * Math.PI * 2;
    g.rotation.x = reduce ? 0 : Math.sin(t * 0.35 + layout.phase) * 0.12;
    g.position.y = baseY + scroll * layout.drift + (reduce ? 0 : Math.sin(t * 0.5 + layout.phase) * 0.12);
  });

  return (
    <group ref={group} position={position} scale={scale}>
      {/* Body: rounded silhouette + thickness + dark rounded edge (clips the image's white corners). */}
      <mesh geometry={bodyGeometry} castShadow>
        <meshStandardMaterial color="#0c0a07" roughness={0.72} metalness={0.35} />
      </mesh>
      {/* Front face: the card art. */}
      <mesh geometry={faceGeometry} position={[0, 0, FACE_OFFSET]}>
        <meshStandardMaterial map={texture} roughness={0.5} metalness={0.2} />
      </mesh>
      {/* Back face: official Magic card back (falls back to a plain dark face if it fails to load). */}
      <mesh geometry={faceGeometry} position={[0, 0, -FACE_OFFSET]} rotation={[0, Math.PI, 0]}>
        {backTexture ? (
          <meshStandardMaterial map={backTexture} roughness={0.55} metalness={0.3} />
        ) : (
          <meshStandardMaterial color="#241d12" roughness={0.55} metalness={0.4} emissive="#d8a24a" emissiveIntensity={0.04} />
        )}
      </mesh>
    </group>
  );
}

/** Loads the shared card-back texture imperatively so a failure degrades to a plain back. */
const useCardBack = (): THREE.Texture | null => {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      BACK_URL,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        // The back mesh is rotated 180° on Y, so mirror the texture horizontally to read correctly.
        t.wrapS = THREE.RepeatWrapping;
        t.repeat.x = -1;
        t.offset.x = 1;
        setTex(t);
      },
      undefined,
      () => setTex(null),
    );
  }, []);
  return tex;
};

/** Renders the cards, resolving each fx into a world x from the live viewport (responsive). */
function Scene({ images, backTexture, reduce }: { images: string[]; backTexture: THREE.Texture | null; reduce: boolean }) {
  // viewport.{width,height} are visible world units at z=0; re-runs on resize/orientation change.
  const viewport = useThree((state: { viewport: { width: number; height: number } }) => state.viewport);
  // Portrait/phone: cards are big relative to the narrow frame, so shrink them and use a layout
  // that stacks down the page (otherwise they overlap into what looks like a single card).
  const narrow = viewport.width < viewport.height;
  const layouts = narrow ? MOBILE_LAYOUTS : LAYOUTS;
  const scale = narrow ? 0.6 : 1;
  const spread = narrow ? 0.66 : 0.82; // keeps cards inside the frame with a margin
  const halfW = viewport.width / 2;

  return (
    <Suspense fallback={null}>
      {images.map((url, i) => {
        const layout = layouts[i];
        const x = layout.fx * halfW * spread;
        return (
          <Card3D
            key={i}
            url={url}
            backTexture={backTexture}
            layout={layout}
            position={[x, layout.y, layout.z]}
            scale={scale}
            reduce={reduce}
          />
        );
      })}
    </Suspense>
  );
}

const hasWebGL = (): boolean => {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch {
    return false;
  }
};

/**
 * A fixed, non-interactive WebGL layer behind the landing content: a handful of real Magic
 * cards rendered as rounded 3D meshes (art front, official Magic back) that idle-spin and
 * turn/drift as the page scrolls.
 */
export const CardScene = ({ images }: { images: string[] }) => {
  const reduce = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const backTexture = useCardBack();

  if (!images.length || !hasWebGL()) {
    return null;
  }

  const cards = images.slice(0, LAYOUTS.length);

  return (
    <div className="landing-canvas" aria-hidden="true">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 6], fov: 42 }}
        gl={{ alpha: true, antialias: true }}
        frameloop={reduce ? 'demand' : 'always'}
      >
        <ambientLight intensity={0.75} />
        <directionalLight position={[3, 5, 6]} intensity={2.1} />
        <pointLight position={[-5, -2, 4]} intensity={40} distance={18} decay={2} color="#e7bd6a" />
        <Scene images={cards} backTexture={backTexture} reduce={reduce} />
      </Canvas>
    </div>
  );
};
