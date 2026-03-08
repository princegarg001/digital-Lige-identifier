---
name: glassmorphism-liquid-theme
description: Guidelines and rules for implementing the Glassmorphism + Liquid Glass UI theme across the Digital Persona application.
---

# Digital Persona UI Theme: Glassmorphism & Liquid Glass

This document outlines the core UX principles and styling rules for the Digital Persona application. It focuses on the structural and interactive properties of the design system, specifically the combination of deep glassmorphism (frosted glass) and liquid glass (fluid, organic interactivity).

**DO NOT** focus on specific color values here. These rules govern transparency, geometry, layering, and interaction to ensure a cohesive, premium experience regardless of the underlying color palette.

## 1. Core UX Philosophy

The Digital Persona interface should feel **immaterial, fluid, and layered**. 
- **Immaterial:** UI elements should appear as thin sheets of frosted glass hovering in space, rather than solid blocks.
- **Fluid (Liquid Glass):** Interactive elements should react organically to user input, resembling liquid surface tension (e.g., subtle scaling, morphing glows, soft spring physics).
- **Layered:** The depth of an element determines its level of blur and shadow. Backgrounds remain visible but softly obscured.

## 2. Glassmorphism Foundations (Transparency & Blur)

To achieve a convincing frosted glass effect, rely on strict rules for background opacity, border highlights, and background blurs.

### Transparency (Backgrounds)
- **Deep Backgrounds (Base Panels):** Use extremely low opacity to let the 3D scene shine through. Typically `bg-white/3` to `bg-white/5`. Do not exceed 10% opacity for large surfaces, as it destroys the immaterial feel.
- **Interactive Surfaces (Controls, Nav):** Slightly higher opacity (`bg-white/5` to `bg-white/10`) to provide contrast and grounding against the background. Give toolbars a bit more substance.
- **Dark Mode vs Light Mode:** Transparency values should adapt. In dark mode, rely on white/x alpha values. Over black, `white/5` is visible.

### Blur (Backdrop Filter)
- **Standard Surfaces:** Use heavy blurring (`backdrop-blur-xl` or `backdrop-blur-2xl`). The blur must be strong enough to diffuse the scene behind it, preventing text readability issues.
- **Small Controls/Toolbars:** Use massive blurring (`backdrop-blur-2xl` or `backdrop-blur-3xl`) to create a solid-feeling, premium "glass pipe" effect.

### Edge Highlights (Borders)
Every piece of glass needs an edge reflection to separate it from the background without using solid lines.
- **Standard Edges:** Use ultra-thin, low-opacity borders: `border border-white/6` to `border border-white/10`.
- **Top/Left Bias (Optional):** For a more realistic lighting effect, borders can sometimes use linear gradients (e.g., stronger white on top, fading to transparent on the bottom).

## 3. Geometry and Curves (Border Radius)

Sharp corners belong in brutalist designs; glassmorphism requires smooth, polished edges.

- **Large Panels & Dialogs:** Use heavy corner radii (`rounded-3xl` or `rounded-[2rem]`). This prevents the glass from looking like a harsh, cut pane.
- **Toolbars & Floating Nav:** Fully rounded "pill" shapes (`rounded-full`) are preferred to give an aerodynamic, hardware-like feel.
- **Buttons & Icons:** Interactive targets should mirror their containers. A `rounded-full` button inside a `rounded-3xl` container creates visual harmony. Inside toolbars, `rounded-full` is mandatory.

## 4. Liquid Glass Effect (Interactivity & Motion)

Liquid Glass is what separates static frosted UI from a living interface. Elements should react to the user.

### Spring Scaling & Hover States
- Controls should feel buoyant. When interacting, components should smoothly scale.
- **Hover:** `hover:scale-105` to simulate surface tension expanding toward the user.
- **Active (Click):** `active:scale-95` or `active:scale-90` to simulate the button being pressed "into" the liquid surface.
- Always use smooth, extended transition durations (e.g., `transition-all duration-300` up to `duration-500`) to avoid rigid, mechanical snapping.

### Glows and "Pulse" Mechanics
- **Hover Glows:** Instead of changing background color abruptly on hover, increase the opacity of the element's shadow. Use `hover:shadow-[0_0_20px_rgba(...)]` to simulate light bleeding through the glass.
- **Ambient Pulses:** Important CTA targets (like the "Initiate Session" node) should use a subtle, continuous looping animation (e.g., an `animate-pulse-ring` or slow `animate-pulse`) to mimic organic breathing.

## 5. Depth and Layering (Shadows)

In a glassmorphic UI, shadows are just as important as the glass itself to define depth.

- **Soft, Dispersed Shadows:** Use `shadow-2xl` for floating panels. The shadow should simulate real-world ambient occlusion.
- **Tinted Shadows:** For liquid components (buttons, badges), use tinted drop shadows (e.g., `shadow-[color]/20`) rather than pure black shadows. This makes the UI feel like it is emitting colored light.
- **Inner Glows / Ring Utilities:** For floating icons or nested surfaces, use a subtle ring (`ring-1 ring-white/20`) combined with an inner shadow to create a bevel effect.

## 6. Layout & Spacing Rules

- **Breathing Room:** Glass UI requires massive internal padding so the frosted effect is highly visible. (e.g., `p-8` to `p-12` on panels).
- **Floating Overlays:** Components should absolutely position themselves over the central focal point (the avatar). Floating headers (`top-0`), floating controls (`bottom-8`), avoiding sticking elements flush against the viewport limits (leave a minimum `8px` or `24px` gutter).

## Summary Checklist for Components
When building a new component, ask:
1. Does it use low-opacity (`white/5`) backgrounds with high blur (`backdrop-blur-xl`)?
2. Does it have an edge highlight (`border-white/10`)?
3. Are the corners significantly rounded (`rounded-3xl` or `full`)?
4. Does it react fluidly to hover and click (`scale-105` and `active:scale-95`)?
5. Does it cast a soft, ambient shadow to lift it off the 3D canvas?

Follow these guidelines strictly to maintain the futuristic, premium "Digital Persona" aesthetic.
