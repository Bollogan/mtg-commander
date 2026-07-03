/**
 * Local type stub for @react-three/fiber (mapped via tsconfig `paths`).
 *
 * The real package augments the GLOBAL JSX namespace with every three.js element, which blows
 * TypeScript's union limit when combined with react-bootstrap's polymorphic components (TS2590).
 * We only need loose typing for the tiny landing scene, so we shim the handful of APIs we use and
 * declare just the three elements we render. Vite still bundles the real package at runtime
 * (it doesn't read tsconfig `paths`).
 */
export const Canvas: any;
export function useFrame(callback: (state: any, delta: number) => void): void;
export function useThree(selector?: (state: any) => any): any;

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        group: any;
        mesh: any;
        boxGeometry: any;
        meshStandardMaterial: any;
        ambientLight: any;
        directionalLight: any;
        pointLight: any;
      }
    }
  }
}
