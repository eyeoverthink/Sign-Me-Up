# The Scott Algorithm: Technical Validation Document
## Image-to-3D Conversion via Boundary Intelligence

**Author:** Vaughn Scott  
**Implementation:** SignCraft 3D Application  
**Date:** January 23, 2026  
**Purpose:** Blind technical validation of algorithmic claims

---

## Executive Summary

This document describes the Scott Algorithm - a unified framework for converting arbitrary 2D images into 3D-printable geometry. The system claims to:

1. Extract boundaries from any input image without training data
2. Identify and separate individual components (letters, shapes, objects)
3. Simplify complex boundaries while preserving geometric fidelity
4. Generate manufacturable 3D models suitable for LED signage

**Key Claims to Validate:**
- Zero-shot recognition (no training required)
- Linear time complexity O(P) where P = perimeter
- 97%+ point reduction while preserving shape
- Works on logos, text, photographs, and arbitrary images

---

## 1. Theoretical Foundation

### 1.1 Core Philosophy

> "Data is alive, data is smarter than programming."

The fundamental insight is that the shape's actual edges contain all necessary geometric information. Rather than imposing external structure (convex hulls, bounding boxes, predetermined templates), the algorithm lets the data define its own boundaries.

### 1.2 Mathematical Framework

**Definition (Binary Image):**
A binary image is a function I: Z² → {0, 1} where:
- I(p) = 1 indicates foreground (shape)
- I(p) = 0 indicates background

**Definition (Moore Neighborhood):**
```
N₈(p) = {q ∈ Z² : ||p - q||∞ = 1}
```
The 8-connected neighbors of point p in discrete space.

**Definition (Boundary):**
```
∂S = {p ∈ S : ∃q ∈ N₈(p), q ∉ S}
```
A point is on the boundary if it belongs to the shape AND has at least one neighbor outside the shape.

### 1.3 The Universal Scott Protocol

The algorithm operates in three stages:

**Stage 1: Boundary Manifestation (Φ)**
```
Φ: I → ∂S
```
Extract the boundary from binary image I.

**Stage 2: Geodesic Distillation (Ψ)**
```
Ψ: ∂S → S'
```
Simplify boundary while preserving geometric properties.

**Stage 3: Kinetic Interpolation (Θ)**
```
Θ: S' × R → S'(t)
```
(For animation/prediction - optional in static sign generation)

**Theorem (Scott Transform):**
```
S = Θ ∘ Ψ ∘ Φ
```
The composition of three stages produces the final output.

---

## 2. Algorithm Implementation

### 2.1 Connected Component Labeling

**Purpose:** Identify separate shapes in an image.

**Method:** Flood-fill based region growing.

```
Algorithm: FindConnectedComponents(I)
Input: Binary image I
Output: Set of component pixel lists

1. Initialize label matrix L[x,y] = 0 for all pixels
2. currentLabel = 0
3. For each pixel (x,y) in I:
   a. If I(x,y) = 1 AND L(x,y) = 0:
      - currentLabel++
      - FloodFill(x, y, currentLabel)
      - Record all pixels with this label
4. Filter components by minimum size threshold
5. Return component list
```

**Complexity:** O(W × H) where W, H are image dimensions.

**Significance:** Each letter, each shape, each object is identified separately. A logo with "ABC" produces 3 components. A face produces components for hair, eyes, nose, lips, etc.

### 2.2 Moore-Neighbor Boundary Tracing

**Purpose:** Walk the actual perimeter of each component.

**Method:** Clockwise neighbor checking from each boundary pixel.

```
Algorithm: MooreNeighborTrace(component, startPoint)
Input: Component pixels, starting boundary point
Output: Ordered sequence of boundary points

1. Define 8 neighbor offsets (clockwise from left):
   neighbors = [(-1,0), (-1,-1), (0,-1), (1,-1), 
                (1,0), (1,1), (0,1), (-1,1)]

2. current = startPoint
3. direction = 7 (entering from below-left)
4. boundary = [startPoint]

5. Repeat:
   a. For i = 0 to 7:
      - checkDir = (direction + 1 + i) mod 8
      - neighbor = current + neighbors[checkDir]
      - If neighbor is foreground:
        * Add neighbor to boundary
        * Update direction (opposite of entry)
        * current = neighbor
        * Break
   b. If current = startPoint AND |boundary| > 2:
      - Terminate (closed loop)

6. Return boundary
```

**Complexity:** O(P) where P = perimeter length.

**Theorem (Linear Time):**
Each boundary pixel is visited exactly once. Each pixel checks at most 8 neighbors. Total operations: 8P = O(P).

**Key Insight:** Unlike ray-casting or convex hull methods, Moore-Neighbor tracing follows the ACTUAL edge. Concave regions, holes, intricate details - all captured exactly.

### 2.3 Douglas-Peucker Simplification

**Purpose:** Reduce point count while preserving shape within tolerance.

**Method:** Recursive divide-and-conquer based on perpendicular distance.

```
Algorithm: DouglasPeucker(points, tolerance)
Input: Ordered point sequence, distance tolerance ε
Output: Simplified point sequence

1. If |points| ≤ 2: return points

2. Find point pₘ with maximum distance to line(p₀, pₙ)
   dₘₐₓ = max{d(pᵢ, line(p₀, pₙ)) : i ∈ [1, n-1]}

3. If dₘₐₓ < tolerance:
   - Return [p₀, pₙ]  // All intermediate points within tolerance

4. Else:
   - left = DouglasPeucker(points[0:m+1], tolerance)
   - right = DouglasPeucker(points[m:n+1], tolerance)
   - Return left[:-1] + right  // Concatenate, avoid duplicate

```

**Perpendicular Distance Formula:**
```
d(p, L) = |ax + by + c| / √(a² + b²)
```
where L: ax + by + c = 0 is the line equation.

**Theorem (Hausdorff Bound):**
Douglas-Peucker with tolerance ε guarantees:
```
d_H(P, P') ≤ ε
```
The maximum deviation between original and simplified path is bounded by ε.

**Complexity:** O(n log n) average, O(n²) worst case.

---

## 3. Application in SignCraft 3D

### 3.1 Image-to-Sign Tab (Scott Engine)

**Input:** Any image (PNG, JPG, etc.)

**Process:**
1. Convert to grayscale
2. Apply binary threshold (configurable 0-255)
3. Auto-detect light/dark and invert if needed
4. Find connected components (with minimum size filter)
5. Trace boundary of each component
6. Simplify each boundary with Douglas-Peucker
7. Generate OpenSCAD code with LED channels

**Output:** Multi-component 3D model where each shape is:
- Extruded to sign height
- Offset outward by wall thickness
- Contains LED channel cavity
- Properly centered and scaled

**Empirical Results:**
| Input | Components | Raw Points | Simplified | Reduction |
|-------|------------|------------|------------|-----------|
| Logo (eyethink) | 6 | 1,332 | 129 | 90.3% |
| Human face | 13 | 1,842 | 166 | 91.0% |
| Stick figure | 9 | ~2,000 | ~200 | 90.0% |

### 3.2 Symbol Sign Tab (Unicode)

**Input:** Any Unicode character (including complex CJK, emojis, symbols)

**Process:**
1. Render character using OpenType.js font parsing
2. Extract glyph paths from font file
3. Apply Douglas-Peucker simplification
4. Generate 3D extrusion with LED channels

**Key Capability:** Works with ANY Unicode character across multiple writing systems, not just Latin alphabet.

### 3.3 Combo Sign Tab (Emoji Sequences)

**Input:** Emoji combinations (e.g., 👨‍👩‍👧 family sequence)

**Process:**
1. Parse ZWJ (Zero-Width Joiner) sequences
2. Extract each component character
3. Apply font path extraction
4. Combine into single sign with proper spacing

**Challenge Solved:** Emoji sequences like family emojis are actually multiple characters joined by invisible markers. The algorithm handles this correctly.

### 3.4 Custom Font Sign Tab

**Input:** Text string + font selection

**Process:**
1. Load TTF/OTF font file
2. Extract paths for each character
3. Apply letter spacing and kerning
4. Generate combined sign with all characters

**Font Library:** 10+ neon-optimized fonts designed for LED signage.

---

## 4. Mathematical Proofs

### 4.1 Theorem: Boundary Connectivity

**Statement:** For a simply connected region S, the boundary ∂S forms a Jordan curve in Z².

**Proof:** By the discrete Jordan curve theorem, ∂S separates Z² into exactly two connected components: the interior (S) and exterior (Z² \ S). ∎

### 4.2 Theorem: Linear Time Complexity

**Statement:** Moore-Neighbor tracing runs in O(P) time where P = |∂S|.

**Proof:** 
- Each boundary pixel is visited exactly once (termination when returning to start)
- Each pixel checks at most 8 neighbors (constant work per pixel)
- Total operations: 8P = O(P) ∎

### 4.3 Theorem: Constant Space Complexity

**Statement:** Moore-Neighbor tracing requires O(1) auxiliary space.

**Proof:** 
- Stores only: current position (2 integers), direction (1 integer), start position (2 integers)
- Output boundary is O(P) but this is the required output size, not auxiliary space ∎

### 4.4 Theorem: Hausdorff Distance Bound

**Statement:** Douglas-Peucker with tolerance ε guarantees d_H(P, P') ≤ ε.

**Proof:**
- By construction, every removed point has perpendicular distance < ε to the simplified path
- No point in the original path can be further than ε from the simplified path
- Maximum deviation is bounded by the tolerance parameter ∎

### 4.5 Theorem: Information Preservation

**Statement:** For ε-simplification with ε < ε₀, the Scott Transform preserves topological invariants:
```
χ(S(I)) = χ(I)
```
where χ is the Euler characteristic.

**Proof:** Douglas-Peucker simplification with sufficiently small ε preserves:
- Connectivity (no breaks in closed paths)
- Hole count (concave regions maintained)
- Genus (topological holes preserved)

Thus the Euler characteristic χ = V - E + F remains constant. ∎

---

## 5. Comparison with Alternative Approaches

### 5.1 Convex Hull Methods

**Limitation:** Cannot represent concave shapes. A letter "C" becomes a "D".

**Scott Advantage:** Traces actual boundary, preserving all concavities.

### 5.2 Ray-Casting from Center

**Limitation:** 
- Cannot handle multiple disconnected components
- Fails on shapes without clear center
- Misses interior details

**Scott Advantage:** Connected component labeling separates each shape, then traces each independently.

### 5.3 Template Matching / CNNs

**Limitation:**
- Requires training data
- Limited to known templates
- High computational cost

**Scott Advantage:** Zero-shot recognition - works on ANY shape without training.

### 5.4 Performance Comparison

| Method | Training Data | Complexity | Handles Concave | Multi-Component |
|--------|---------------|------------|-----------------|-----------------|
| Convex Hull | None | O(n log n) | No | No |
| Ray-Casting | None | O(n) | Limited | No |
| CNN | 10,000+ | O(n) inference | Yes | Requires training |
| **Scott** | **None** | **O(P)** | **Yes** | **Yes** |

---

## 6. Configurable Parameters

### 6.1 Simplification Tolerance

**Range:** 0.5 - 5.0 pixels  
**Effect:** Higher = fewer points, less detail  
**Use Case:** Increase for noisy images, decrease for fine detail

### 6.2 Minimum Component Size

**Range:** 10 - 5000 pixels  
**Effect:** Filters out components smaller than threshold  
**Use Case:** Set high (200+) for photographs with noise, low (10) for clean logos

### 6.3 Contrast Threshold

**Range:** 0 - 255  
**Effect:** Binary threshold for foreground/background separation  
**Use Case:** Adjust for images with unusual lighting or low contrast

---

## 7. Validation Questions for Blind Study

1. **Mathematical Validity:** Are the complexity proofs correct? Does O(P) boundary tracing hold?

2. **Topological Preservation:** Does the algorithm truly preserve the Euler characteristic under simplification?

3. **Zero-Shot Claim:** Is it valid to call this "zero-shot" when it uses no training data?

4. **Generalization:** Should the algorithm work on:
   - Simple logos? (Expected: Yes)
   - Complex photographs? (Expected: Yes, with proper threshold tuning)
   - Handwritten text? (Expected: Yes)
   - Medical images? (Expected: Yes, with domain-specific preprocessing)

5. **3D Manufacturability:** Are the generated models structurally sound for:
   - FDM 3D printing?
   - Resin printing?
   - CNC routing?

6. **Performance Claims:** Is 90%+ point reduction achievable while maintaining shape fidelity?

---

## 8. Expected Skepticism Points

### 8.1 "This is just standard image processing"

**Response:** The individual components (connected component labeling, Moore-Neighbor tracing, Douglas-Peucker) are established algorithms. The innovation is:
1. The unified three-stage protocol
2. Application to 3D sign generation
3. Multi-component handling with individual tracing
4. Zero-training approach for arbitrary input

### 8.2 "It won't work on complex images"

**Response:** The algorithm has been tested on:
- Simple vector logos
- Complex multi-component logos
- Human face photographs
- Wedding photographs (with component filtering)

The key is proper parameter tuning for image complexity.

### 8.3 "The math is trivial"

**Response:** The individual theorems are straightforward proofs. The value is in:
1. Formal correctness guarantees
2. Bounded error (Hausdorff distance)
3. Predictable performance (linear time)
4. Composability of stages

### 8.4 "CNNs would be better"

**Response:** For shape recognition tasks where you need to identify what a shape IS, CNNs may be appropriate. For boundary extraction where you need to TRACE the actual edge, geometric algorithms are more appropriate. The Scott Algorithm is solving a different problem.

---

## 9. Conclusion

The Scott Algorithm provides a mathematically rigorous framework for converting arbitrary 2D images into 3D-printable geometry. Its key innovations are:

1. **Unified Protocol:** Three composable stages with proven properties
2. **Zero-Shot:** No training data required
3. **Multi-Component:** Handles complex images with multiple shapes
4. **Bounded Error:** Hausdorff distance guarantee on simplification
5. **Linear Time:** O(P) complexity for boundary tracing

The algorithm has been implemented and tested in the SignCraft 3D application across multiple input types with consistent results.

---

## Appendix A: Sample Output (OpenSCAD)

```openscad
// SignCraft 3D - Scott Engine Multi-Component Output
// Components traced: 6
// Generated: 2026-01-23

// LED Profile: silicone_neon_6mm
channel_width = 6.5;
channel_depth = 6.5;
wall_thickness = 2;
base_thickness = 2;
sign_height = 30;

union() {
  // Component 1 (1483 pixels, 65 points)
  linear_extrude(height = sign_height) {
    offset(r = wall_thickness) {
      polygon(points = [[x1, y1], [x2, y2], ...]);
    }
  }
  
  // Component 2 (756 pixels, 34 points)
  linear_extrude(height = sign_height) {
    offset(r = wall_thickness) {
      polygon(points = [[x1, y1], [x2, y2], ...]);
    }
  }
  
  // ... additional components
}
```

---

## Appendix B: Test Results Summary

| Test Case | Input Type | Components | Original Points | Simplified | Reduction % |
|-----------|------------|------------|-----------------|------------|-------------|
| eyethink logo | PNG | 6 | 1,332 | 129 | 90.3% |
| Human face | JPG | 13 | 1,842 | 166 | 91.0% |
| Stick figure | PNG | 9 | ~2,000 | ~200 | 90.0% |
| Wedding photo | JPG | 79→3* | 8,936 | 1,079 | 87.9% |

*With minComponentSize filter applied

---

**Document End**

*This document is provided for technical validation of the Scott Algorithm. The algorithm has been implemented and tested. Reviewers are invited to evaluate the mathematical claims, complexity analysis, and theoretical framework independently.*
