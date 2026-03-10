Integrating a Ready Player ME 3D model with Lipsyncing in React
Have you ever wanted to create an app where a 3D avatar comes to life and speaks what you type? In this article, I’ll show you how I built…

By Israr Mehmood

6 min. readView original
Implementation
Before jumping into the code, create your 3D avatar using Ready Player Me. Customize it to your liking, then export it in GLB format. Save the .glb file in your project’s public folder for easy access. Once your avatar is ready, we’ll integrate it into the React app!

Let’s Jump into the Code

Create three folders inside your public directory: animations, textures, and models. Paste your exported .glb file (the 3D avatar) into the public/models folder.


Inside the src folder, create two new directories: components and screens.

Next, we’ll use the gltfjsx tool to convert your .glb file into a reusable React component. Run the following command:

npx gltfjsx public/models/674d75af3c0313725248ed0d.glb -o src/components/Avatar.jsx -r public
What Does This Command Do?

After running the command, you’ll get a ready-to-use Avatar.jsx component to render your 3D avatar in the app.


Modify main.jsx file replace code with


App.jsx contains only one screen rendered, which is AvatarView


Let's jump into AvatarView.jsx

import { useState, useRef, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import Experience from "../components/Experience";
import { MdFullscreen, MdCloseFullscreen, MdVolumeUp } from "react-icons/md";
function AvatarView() {
  const [text, setText] = useState("");
  const [speak, setSpeak] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const containerRef = useRef(null);
  const height = useMemo(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    return width < 768 ? `${Math.round(height * 0.68)}px` : `${Math.round(width * 0.3)}px`;
  }, [isFullScreen]);
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current
        ?.requestFullscreen?.()
        .then(() => setIsFullScreen(true));
    } else {
      document.exitFullscreen?.().then(() => setIsFullScreen(false));
    }
  };

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullScreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullScreenChange);
  }, []);
  return (
    <div
      style={{
        height: "97vh",
        width: "99vw",
        backgroundColor: "#2d2d2d",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
      }}
    >
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: "100%",
          height: height,
          transition: "all 0.3s ease",
          backgroundColor: "#2d2d2d",
          borderRadius: isFullScreen ? "0" : "15px",
          overflow: "hidden",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
      >
        <button
          onClick={toggleFullScreen}
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            color: "white",
            border: "none",
            cursor: "pointer",
            zIndex: 10,
            borderRadius: "50%",
            width: "35px",
            height: "35px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background-color 0.3s ease",
          }}
          onMouseEnter={(e) =>
            (e.target.style.backgroundColor = "rgba(255, 255, 255, 0.4)")
          }
          onMouseLeave={(e) =>
            (e.target.style.backgroundColor = "rgba(255, 255, 255, 0.2)")
          }
          title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullScreen ? (
            <MdCloseFullscreen size={25} />
          ) : (
            <MdFullscreen size={25} />
          )}
        </button>

        <Canvas
          shadows
          camera={{ position: [0, 0, 10], fov: 20 }}
          style={{
            height: "100%",
            width: "100%",
            transition: "all 0.3s ease",
          }}
        >
          <color attach="background" args={["#2d2d2d"]} />
          <Experience speakingText={text} speak={speak} setSpeak={setSpeak} />
        </Canvas>
      </div>

      {!isFullScreen && (
        <div
          style={{
            width: "100%",
            height: "20vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "10px 20px",
            backgroundColor: "rgba(45, 45, 45, 0.9)",
            boxSizing: "border-box",
          }}
        >
          <textarea
            rows={4}
            value={text}
            placeholder="Type something..."
            style={{
              padding: "10px",
              width: "70%",
              borderRadius: "10px",
              border: "1px solid #555",
              resize: "none",
              fontSize: "16px",
              backgroundColor: "#1e1e1e",
              color: "#fff",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              boxSizing: "border-box",
            }}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            onClick={() => {
              setSpeak(true);
            }}
            style={{
              marginLeft: "10px",
              padding: "10px 20px",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background-color 0.3s ease",
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#45a049")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "#4CAF50")}
          >
            <MdVolumeUp size={20} style={{ marginRight: "8px" }} />
            Speak
          </button>
        </div>
      )}
    </div>
  );
}
export default AvatarView;

This component integrates a 3D avatar with a user-friendly interface, allowing users to type text and see the avatar speak it, with fullscreen support for an immersive experience. AvatarView.jsx uses the Experience component

Get Israr Mehmood’s stories in your inbox
Join Medium for free to get updates from this writer.

Let’s understand the Experience.jsx component

import { Environment, useTexture } from "@react-three/drei";
import { Avatar } from "./Avatar";
import { useThree } from "@react-three/fiber";
import { TEXTURE_PATH } from "../constant";
import PropTypes from "prop-types";
const Experience = ({ speakingText, speak, setSpeak }) => {
  const texture = useTexture(TEXTURE_PATH);
  const viewport = useThree((state) => state.viewport);
  return (
    <>
      {/* <OrbitControls /> */}{" "}
      {/** OrbitControls is Allows the user to control the camera with the mouse or touch */}
      <Avatar
        position={[0, -5, 5]}
        scale={3}
        text={speakingText}
        speak={speak}
        setSpeak={setSpeak}
      />{" "}
      {/* Position [] take three values first is x, second is y, third is z. This is use to change the view of avatar and scale is use to handle avatar zoom */}
      <Environment preset="sunset" />{" "}
      {/*Adds realistic lighting & reflections. */}
      <mesh>
        <planeGeometry args={[viewport.width, viewport.height]} />
        <meshBasicMaterial map={texture} />
      </mesh>
    </>
  );
};
Experience.propTypes = {
  speakingText: PropTypes.string.isRequired,
  speak: PropTypes.bool.isRequired,
  setSpeak: PropTypes.func.isRequired,
};
export default Experience;
Experience component creates a 3D scene with a customizable avatar, realistic lighting, and a textured background, providing the foundation for the interactive avatar experience.

Background Texture:


The Experience component contains the Avatar component. let's get inside of that component

Avatar.jsx
import React, { useState, useEffect, useRef } from "react";
import { useGraph } from "@react-three/fiber";
import { useGLTF, useAnimations, useFBX } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import { CORRESPONDING_VISEME } from "../constant";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useControls } from "leva";
export function Avatar(props) {
  const { scene } = useGLTF("/models/674d75af3c0313725248ed0d.glb");
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone);
  const { animations: idleAnimation } = useFBX("/animations/Idle.fbx");
  idleAnimation[0].name = "Idle";
  const [animation] = useState("Idle");
  const group = useRef();
  const { actions } = useAnimations([idleAnimation[0]], group);
  const currentViseme = useRef(null);
  const { morphTargetSmoothing } = useControls(
    {
      headFollow: true,
      smoothMorphTarget: true,
      morphTargetSmoothing: { value: 0.3, min: 0, max: 1, step: 0.01 },
    },
    { hidden: true }
  );
  useEffect(() => {
    actions[animation] && actions[animation].reset().fadeIn(0.5).play();
    return () => actions[animation] && actions[animation].fadeOut(0.5);
  }, [animation]);
  useEffect(() => {
    if (props?.speak) {
      const utterance = new SpeechSynthesisUtterance(props.text);
      const words = props.text.toUpperCase().split("");

      utterance.onboundary = (event) => {
        const word = words[event.charIndex];
        if (!word) return;
        const phoneme = word.toUpperCase();
        const viseme = CORRESPONDING_VISEME[phoneme];
        if (viseme) {
          currentViseme.current = viseme;
          setTimeout(() => {
            if (currentViseme.current === viseme) {
              currentViseme.current = null;
            }
          }, 150);
        }
      };

      utterance.onend = () => {
        console.log("Speech ended, resetting viseme");
        setTimeout(() => {
          currentViseme.current = null;
          Object.keys(nodes.Wolf3D_Head.morphTargetDictionary).forEach(
            (key) => {
              const index = nodes.Wolf3D_Head.morphTargetDictionary[key];
              nodes.Wolf3D_Head.morphTargetInfluences[index] = 0;
              nodes.Wolf3D_Teeth.morphTargetInfluences[index] = 0;
            }
          );
        }, 300);
      };

      speechSynthesis.speak(utterance);
      props.setSpeak(false);
    }
  }, [props?.speak]);
  useFrame(() => {
    if (currentViseme.current) {
      const index =
        nodes.Wolf3D_Head.morphTargetDictionary[currentViseme.current];

      nodes.Wolf3D_Head.morphTargetInfluences[index] = THREE.MathUtils.lerp(
        nodes.Wolf3D_Head.morphTargetInfluences[index],
        1,
        morphTargetSmoothing
      );

      nodes.Wolf3D_Teeth.morphTargetInfluences[index] = THREE.MathUtils.lerp(
        nodes.Wolf3D_Teeth.morphTargetInfluences[index],
        1,
        morphTargetSmoothing
      );
    } else {
      Object.keys(nodes.Wolf3D_Head.morphTargetDictionary).forEach((key) => {
        const index = nodes.Wolf3D_Head.morphTargetDictionary[key];

        nodes.Wolf3D_Head.morphTargetInfluences[index] = THREE.MathUtils.lerp(
          nodes.Wolf3D_Head.morphTargetInfluences[index],
          0,
          0.15 // Lower value = smoother transition to idle
        );

        nodes.Wolf3D_Teeth.morphTargetInfluences[index] = THREE.MathUtils.lerp(
          nodes.Wolf3D_Teeth.morphTargetInfluences[index],
          0,
          0.15
        );
      });
    }
  });
  return (
    <group {...props} dispose={null} ref={group}>
      <primitive object={nodes.Hips} />
      <skinnedMesh
        geometry={nodes.Wolf3D_Hair.geometry}
        material={materials.Wolf3D_Hair}
        skeleton={nodes.Wolf3D_Hair.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Glasses.geometry}
        material={materials.Wolf3D_Glasses}
        skeleton={nodes.Wolf3D_Glasses.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Body.geometry}
        material={materials.Wolf3D_Body}
        skeleton={nodes.Wolf3D_Body.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Bottom.geometry}
        material={materials.Wolf3D_Outfit_Bottom}
        skeleton={nodes.Wolf3D_Outfit_Bottom.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Footwear.geometry}
        material={materials.Wolf3D_Outfit_Footwear}
        skeleton={nodes.Wolf3D_Outfit_Footwear.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Top.geometry}
        material={materials.Wolf3D_Outfit_Top}
        skeleton={nodes.Wolf3D_Outfit_Top.skeleton}
      />
      <skinnedMesh
        name="EyeLeft"
        geometry={nodes.EyeLeft.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeLeft.skeleton}
        morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences}
      />
      <skinnedMesh
        name="EyeRight"
        geometry={nodes.EyeRight.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeRight.skeleton}
        morphTargetDictionary={nodes.EyeRight.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeRight.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Head"
        geometry={nodes.Wolf3D_Head.geometry}
        material={materials.Wolf3D_Skin}
        skeleton={nodes.Wolf3D_Head.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Teeth"
        geometry={nodes.Wolf3D_Teeth.geometry}
        material={materials.Wolf3D_Teeth}
        skeleton={nodes.Wolf3D_Teeth.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Teeth.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Teeth.morphTargetInfluences}
      />
    </group>
  );
}

useGLTF.preload("/models/674d75af3c0313725248ed0d.glb");

Component Implementation Details

Loading the 3D Model and Animations
useGLTF: This hook loads the 3D avatar model from a .glb file.

SkeletonUtils.clone: To avoid mutating the original model, the scene is cloned using SkeletonUtils. This ensures that multiple instances of the avatar can be used without conflicts.

useGraph: Extracts the nodes (mesh parts) and materials from the cloned scene,

useFBX: Loads an FBX animation file (e.g., Idle.fbx) to provide a default idle animation for the avatar.

2. Animation Management
useAnimations: This hook manages the avatar’s animations. The idle animation is stored in the actions object, which allows us to play, pause, or fade animations.

useEffect for Animation: When the component mounts, the idle animation is played with a smooth fade-in effect. When the component unmounts, the animation fades out to ensure a clean transition.

3. Lip-Syncing Implementation

SpeechSynthesis API:

When the speak prop is triggered, a SpeechSynthesisUtterance is created for the input text.

The onboundary event listener detects phonemes (sounds) in the text and maps them to visemes (visual mouth shapes) using the CORRESPONDING_VISEME constant. For example, the phoneme “A” might map to the viseme “viseme_aa.”

The currentViseme ref tracks the active viseme, ensuring the avatar’s mouth moves in sync with the speech.

Morph Targets:

The avatar’s head and teeth have morph targets (blend shapes) that define different mouth shapes.

During speech, the useFrame hook updates the morph target influences in real-time, using THREE.MathUtils.lerp to smoothly transition between visemes.

When speech ends, the morph targets are reset to their default state, ensuring the avatar returns to its idle expression.

4. Rendering the Avatar
The avatar is rendered as a group containing multiple skinnedMesh components. Each skinnedMesh represents a part of the avatar (e.g., body, hair, glasses, eyes, teeth).

5. How Lip-Syncing Works Step-by-Step
The user types text and clicks “Speak.”

The SpeechSynthesisUtterance breaks the text into phonemes (sounds).

Each phoneme is mapped to a viseme (e.g., “A” → “viseme_aa”).

The useFrame hook updates the avatar’s morph targets in real-time, smoothly transitioning between visemes to match the speech.

When speech ends, the morph targets are reset, and the avatar returns to its idle state.