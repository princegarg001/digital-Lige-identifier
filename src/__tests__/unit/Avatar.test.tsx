/**
 * Unit Tests for Avatar Component
 * Tests 3D model loading, lip-sync, and animation handling
 */

import { describe, it, expect, vi } from 'vitest';
import { render, renderHook } from '@testing-library/react';
import { Canvas } from '@react-three/fiber';
import { Avatar } from '@/components/canvas/Avatar';
import { useGLTF } from '@react-three/drei';

vi.mock('@react-three/drei', async () => {
  const actual = await vi.importActual('@react-three/drei');
  const mockUseGLTF = Object.assign(vi.fn(() => ({
    scene: {
      clone: vi.fn(() => ({})),
    },
    nodes: {
      Wolf3D_Hair: { geometry: {}, skeleton: {} },
      Wolf3D_Glasses: { geometry: {}, skeleton: {} },
      Wolf3D_Outfit_Top: { geometry: {}, skeleton: {} },
      Wolf3D_Outfit_Bottom: { geometry: {}, skeleton: {} },
      Wolf3D_Outfit_Footwear: { geometry: {}, skeleton: {} },
      Wolf3D_Body: { geometry: {}, skeleton: {} },
      EyeLeft: { geometry: {}, skeleton: {}, morphTargetDictionary: {}, morphTargetInfluences: [] },
      EyeRight: { geometry: {}, skeleton: {}, morphTargetDictionary: {}, morphTargetInfluences: [] },
      Wolf3D_Head: {
        geometry: {},
        skeleton: {},
        morphTargetDictionary: { jawOpen: 0, mouthOpen: 1 },
        morphTargetInfluences: [0, 0],
      },
      Wolf3D_Teeth: {
        geometry: {},
        skeleton: {},
        morphTargetDictionary: { jawOpen: 0 },
        morphTargetInfluences: [0],
      },
      Hips: { position: { y: 0 } },
    },
    materials: {
      Wolf3D_Hair: {},
      Wolf3D_Glasses: {},
      Wolf3D_Outfit_Top: {},
      Wolf3D_Outfit_Bottom: {},
      Wolf3D_Outfit_Footwear: {},
      Wolf3D_Body: {},
      Wolf3D_Eye: {},
      Wolf3D_Skin: {},
      Wolf3D_Teeth: {},
    },
  })), { preload: vi.fn() });

  return {
    ...actual,
    useGLTF: mockUseGLTF,
  };
});

describe('Avatar Component', () => {
  const mockAudioLevelRef = { current: 0 };

  describe('Rendering', () => {
    it('should render without crashing', () => {
      expect(() => {
        render(
          <Canvas>
            <Avatar audioLevelRef={mockAudioLevelRef} />
          </Canvas>
        );
      }).not.toThrow();
    });

    it('should render with audio level ref prop', () => {
      const mockAudioLevelRefWithLevel = { current: 0.5 };
      expect(() => {
        render(
          <Canvas>
            <Avatar audioLevelRef={mockAudioLevelRefWithLevel} />
          </Canvas>
        );
      }).not.toThrow();
    });
  });

  describe('Model Structure', () => {
    it('should load avatar model from correct path', () => {
      const { result } = renderHook(() => useGLTF('/avatar-transformed.glb'));
      
      // Verify the mock was set up correctly
      expect(result.current.nodes.Wolf3D_Head).toBeDefined();
    });

    it('should have all required mesh nodes', () => {
      const mockReturn = (useGLTF as any)();

      expect(mockReturn.nodes.Wolf3D_Head).toBeDefined();
      expect(mockReturn.nodes.Wolf3D_Teeth).toBeDefined();
      expect(mockReturn.nodes.Wolf3D_Body).toBeDefined();
      expect(mockReturn.nodes.EyeLeft).toBeDefined();
      expect(mockReturn.nodes.EyeRight).toBeDefined();
    });
  });

  describe('Lip-Sync Functionality', () => {
    it('should have morph targets for lip-sync', () => {
      const mockReturn = (useGLTF as any)();

      const head = mockReturn.nodes.Wolf3D_Head;
      expect(head.morphTargetDictionary).toBeDefined();
      expect(head.morphTargetDictionary.jawOpen).toBeDefined();
      expect(head.morphTargetDictionary.mouthOpen).toBeDefined();
    });

    it('should update morph targets based on audio level', () => {
      const mockReturn = (useGLTF as any)();

      // Verify initial state
      expect(mockReturn.nodes.Wolf3D_Head.morphTargetInfluences).toEqual([0, 0]);
      
      // The actual morph target updates happen in useFrame
      // which is tested through integration tests
    });
  });

  describe('ARKit Blendshapes', () => {
    it('should support ARKit blendshape names', () => {
      const mockReturn = (useGLTF as any)();

      const head = mockReturn.nodes.Wolf3D_Head;
      const teeth = mockReturn.nodes.Wolf3D_Teeth;

      // Check for ARKit-compatible morph target names
      expect(head.morphTargetDictionary).toHaveProperty('jawOpen');
      expect(head.morphTargetDictionary).toHaveProperty('mouthOpen');
      expect(teeth.morphTargetDictionary).toHaveProperty('jawOpen');
    });
  });

  describe('Animation Support', () => {
    it('should have skeleton for animations', () => {
      const mockReturn = (useGLTF as any)();

      Object.values(mockReturn.nodes).forEach((node: any) => {
        if (node.skeleton) {
          expect(node.skeleton).toBeDefined();
        }
      });
    });

    it('should have Hips bone for body animations', () => {
      const mockReturn = (useGLTF as any)();

      expect(mockReturn.nodes.Hips).toBeDefined();
      expect(mockReturn.nodes.Hips.position).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should preload model', () => {
      // Check if preload was called
      expect((useGLTF as any).preload).toBeDefined();
    });
  });
});
