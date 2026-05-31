# SignCraft 3D - 3D Signage Letter Generator

## Overview

SignCraft 3D is a web-based application designed for generating 3D printable signage letters and custom 3D lighting elements. It features a visual editor with a real-time 3D preview, enabling users to customize text, fonts, LED/neon wiring channels, and mounting holes. The application supports export to common 3D printing formats (STL, OBJ, 3MF). Its primary purpose is to provide a comprehensive solution for creating unique illuminated signage and decorative lighting, targeting both hobbyists and professionals. The project's ambition is to become the leading platform for custom 3D printable lighting designs, expanding beyond simple letters to include complex modular systems and artistic creations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript (Vite).
- **Routing**: Wouter.
- **State Management**: Zustand for local state, TanStack React Query for server state.
- **3D Rendering**: React Three Fiber with Three.js.
- **UI Components**: Shadcn/ui (Radix UI, Tailwind CSS) for a consistent design system with light/dark mode.

### Backend Architecture
- **Runtime**: Node.js with Express.js for RESTful JSON API services.
- **Build System**: esbuild for server, Vite for client.
- **Key Features**: Server-side generation of various 3D models including custom text, pet tags, modular light panels, retro neon signs, modular tube components, LED holders, "Eggison" bulbs, LED grid signs, advanced light boxes, filament shape formers, animation sequences, holographic panels, hexagonal LED panels, and phrase signs.
  - **Specialized Generators**:
    - **LED Magnetic Holder System**: Modular two-piece "Oreo cookie" design with screw-together halves, supporting wired, NeoPixel, and self-contained battery power modes, magnetic base, helical screw threads, LED clips, and wire routing.
    - **Hexagonal LED Panel System**: Modular panel editor with connection presets, LED type selection, diffusers, and module set export.
    - **LED Channel/Diffuser Designer**: Creates hollow U-shaped LED channels with diverse shape patterns and LED type profiles, generating watertight STL files with snap-on diffuser covers.
    - **Filament Shape Former Dual Base**: Supports Edison screw threads (E26/E27, E14, E12) and Mason Jar bases.
    - **Image-to-Sign Generator (Scott Engine)**: Converts images/logos into 3D printable LED signs using Moore-Neighbor tracing and Douglas-Peucker simplification. Features a multi-layer system for per-layer configuration (main, hole, recessed, raised) and "Kid Cut" (Scissors Protocol) for background removal.
    - **Light Box Generator**: "Hamburger" style LED enclosure generator creating 3-layer printable designs (base plate, middle layer with LED channels, top plate/diffuser).
    - **Phrase Sign Designer**: Modular text-based LED sign generator with three shell modes (full_enclosure, half_shell, mounting_plate), expanded LED types, LED channel routing, wire holes, friction lips for neon, and optional diffuser lids.
    - **Scott Laboratory**: Interactive zero-shot shape recognition demo.
    - **LED Keychain Designer**: Battery-powered LED keychain/pet tag generator with customizable shapes, text styles, LED types, battery options, switch positions, and internal wiring.
    - **Eggison Vase/Spiral Mode**: Single-wall continuous spiral geometry with lobular threads, spiral twist control, phi-ribs, and integrated LED chassis.
    - **Luminary Engine V5 (Retro Tab)**: Advanced Edison bulb thread and LED mounting system with ISO standard or lobular threads, C-clamp LED clips, phi-rib patterns, and spiral twist.
    - **Lithophane Designer (Enhanced)**: Creates 3D printable images that reveal when backlit, with depth modes, clamshell options, shell textures, and snap-fit assembly.
    - **Scott Geo-Box Lab**: Layered LED light box system using real-world map data (OpenStreetMap) processed by Scott Algorithm for stacked, LED-backlit layers.
    - **Art Wall - Pop Culture LED Panels**: LED-backlit wall art panel generator featuring pop culture icons with searchable library, LED color selection, frame styles, size presets, lighting effects, and layout options. **Now enhanced with custom image upload using Scott Algorithm** with two trace modes: Cutout Mode (CNC inverse where traced shapes become LED holes for backlighting) and Detail Mode (hairline raised contours for fine detail registration).

### Data Storage
- **ORM**: Drizzle ORM for PostgreSQL.
- **Current State**: In-memory, with PostgreSQL integration prepared.

### 3D Generation System
- Employs custom triangle mesh algorithms for STL generation.
- **Geometry Engine**: OpenSCAD Offset-Based Geometry Engine with a Hardware Abstraction Layer (HAL) for procedural generation, including LED profiles, tolerance profiles, 2D primitives, 3D features, and direct STL/OpenSCAD export.
- **Advanced Geometric Intelligence (Scott Algorithm)**: Proprietary algorithms for shape processing: Moore-Neighbor Boundary Tracing, Phi-Enhanced Douglas-Peucker Simplification, Zero-Shot Shape Recognition, 4D Temporal Prediction, Intelligent Letter Welding, and Scott Variance Index for AI vs Real Photo detection.
- **Phi-Harmonic Resonance System**: Golden ratio (φ) optimization applied to simplification, thresholds, LED spacing, and animation timing.
- **4D Temporal Bridge**: Enhanced temporal prediction with phi-harmonic coherence and velocity-based position forecasting.
- **Sequence Mode**: Temporal sequence recognition system with loop detection and next-shape prediction.
- **Scott 4D Velocity Vector System**: State tracking and trajectory prediction for faster performance.
- **Phi-Vortex Hyper-Lattice Generator**: Golden angle twisted geometry for structural reinforcement.
- **Preview Smoothing System**: Real-time geometry prediction using Scott 4D for smooth UI updates.
- **Font Loader System**: OpenType.js-based font path extraction for TTF/OTF fonts.

## External Dependencies

### Frontend Libraries
- `@react-three/fiber`, `@react-three/drei`, `three`: 3D rendering.
- `@tanstack/react-query`: Server state management.
- `zustand`: Client-side state management.
- `wouter`: Client-side routing.
- Radix UI primitives, `tailwindcss`: UI components and styling.

### Backend Libraries
- `express`: Web server.
- `drizzle-orm`, `drizzle-kit`: Database ORM.
- `zod`: Schema validation.
- `connect-pg-simple`: PostgreSQL session store (future use).

### Database
- PostgreSQL.

### Build Tools
- Vite: Frontend.
- esbuild: Server-side.
- TypeScript: Language.