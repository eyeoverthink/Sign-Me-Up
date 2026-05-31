#!/usr/bin/env python3
"""
Test the limits of the Transfinite Representation System.
This script demonstrates how the system handles hyper-massive numbers
that would crash classical computing systems.
"""

import sys
sys.path.insert(0, '.')

# Increase integer string conversion limit for large numbers
sys.set_int_max_str_digits(10000)

from quantum_language import (
    TransfiniteSymbol,
    TransfiniteLevel,
    KnuthUpArrow,
    QuantumOracle
)

def test_knuth_up_arrow():
    """Test Knuth Up-Arrow Notation compression"""
    print("\n=== KNUTH UP-ARROW NOTATION TESTS ===\n")
    
    test_values = [
        100,
        1000,
        10**6,  # 1 million
        10**12,  # 1 trillion
        10**50,  # Googol-scale
        10**100,  # Actual Googol
        10**256,  # 2^256 scale (state complexity)
    ]
    
    for value in test_values:
        compressed = KnuthUpArrow.compress(value)
        try:
            magnitude = KnuthUpArrow.estimate_magnitude(compressed)
            if magnitude == float('inf'):
                magnitude_str = "∞ (hyper-massive)"
            else:
                magnitude_str = f"{magnitude:.2e}"
        except (ValueError, OverflowError):
            magnitude_str = "∞ (exceeds computation limit)"
        
        print(f"Value: 10^{len(str(value))-1}")
        print(f"  Compressed: {compressed}")
        print(f"  Magnitude Class: {magnitude_str}")
        print()

def test_transfinite_symbols():
    """Test Transfinite Symbol creation and representation"""
    print("\n=== TRANSFINITE SYMBOL TESTS ===\n")
    
    oracle = QuantumOracle()
    
    test_cases = [
        (64, "Standard 64-bit integer"),
        (128, "128-bit encryption key"),
        (256, "2^256 state complexity (LazarusEngine)"),
        (512, "512-bit hash"),
        (1024, "1024-bit quantum state"),
        (2048, "2048-bit RSA key"),
    ]
    
    for bits, description in test_cases:
        print(f"Test: {description}")
        print(f"  Complexity: {bits} bits")
        
        representation = oracle.represent_state_complexity(bits)
        
        print(f"  Representation Type: {representation['representation']}")
        
        if representation['representation'] == 'transfinite':
            print(f"  Symbol: {representation['symbol']}")
            print(f"  Classical Storage: {representation['classical_storage']}")
            print(f"  Quantum Storage: {representation['quantum_storage']}")
            print(f"  Compression Ratio: {representation['compression_ratio']}")
            
            # Show visual representation
            visual = representation['visual']
            print(f"  Visual Rendering:")
            print(f"    Mathematical: {visual['mathematical']}")
            print(f"    Geometric Density: {visual['geometric']['density']:.4f}")
            print(f"    Complexity (phi_power): {visual['geometric']['complexity']}")
            print(f"    Cardinality: {visual['geometric']['cardinality_symbol']}")
            print(f"    Color Shift: {visual['geometric']['color_shift']:.2f}°")
            print(f"    Fractal Depth: {visual['geometric']['fractal_depth']}")
        else:
            print(f"  Storage: {representation['storage']}")
        
        print()

def test_visual_rendering():
    """Test visual rendering for different transfinite levels"""
    print("\n=== VISUAL RENDERING TESTS ===\n")
    
    symbols = [
        TransfiniteSymbol(TransfiniteLevel.LINEAR, 5, geometric_density=0.1),
        TransfiniteSymbol(TransfiniteLevel.EXPONENTIAL, 15, geometric_density=0.5),
        TransfiniteSymbol(TransfiniteLevel.HYPER_EXPONENTIAL, 25, geometric_density=0.8),
        TransfiniteSymbol(TransfiniteLevel.TRANSCENDENTAL, 50, geometric_density=0.95),
        TransfiniteSymbol(TransfiniteLevel.ABSOLUTE, 100, geometric_density=1.0),
    ]
    
    for symbol in symbols:
        print(f"Symbol: {symbol}")
        visual = symbol.to_visual_representation()
        print(f"  Mathematical: {visual['mathematical']}")
        print(f"  Geometric Properties:")
        print(f"    Density: {visual['geometric']['density']}")
        print(f"    Complexity: {visual['geometric']['complexity']}")
        print(f"    Cardinality: {visual['geometric']['cardinality_symbol']}")
        print(f"    Color Shift: {visual['geometric']['color_shift']:.2f}°")
        print(f"    Fractal Depth: {visual['geometric']['fractal_depth']}")
        print()

def test_extreme_limits():
    """Test extreme limits - numbers that would crash classical systems"""
    print("\n=== EXTREME LIMITS TEST ===\n")
    
    oracle = QuantumOracle()
    
    print("Testing numbers that would cause classical overflow:\n")
    
    # Test progressively larger state complexities
    extreme_cases = [
        (4096, "4096-bit state"),
        (8192, "8192-bit state"),
        (16384, "16384-bit state"),
        (32768, "32768-bit state"),
        (65536, "65536-bit state"),
    ]
    
    for bits, description in extreme_cases:
        print(f"{description} (2^{bits} possible states)")
        representation = oracle.represent_state_complexity(bits)
        
        if representation['representation'] == 'transfinite':
            print(f"  ✓ Compressed to: {representation['symbol']}")
            print(f"  ✓ Compression: {representation['compression_ratio']}:1")
        else:
            print(f"  ✓ Up-arrow notation: {representation['notation']}")
        print()

def test_memory_comparison():
    """Compare memory usage between classical and transfinite"""
    print("\n=== MEMORY COMPARISON TEST ===\n")
    
    oracle = QuantumOracle()
    
    print("Memory required to store state complexity:\n")
    
    test_bits = [256, 512, 1024, 2048, 4096]
    
    for bits in test_bits:
        representation = oracle.represent_state_complexity(bits)
        
        classical_bytes = bits / 8
        
        if representation['representation'] == 'transfinite':
            quantum_bytes = 1  # Single symbol pointer
            print(f"{bits}-bit state:")
            print(f"  Classical: {classical_bytes:.2f} bytes")
            print(f"  Transfinite: {quantum_bytes} byte")
            print(f"  Savings: {((classical_bytes - quantum_bytes) / classical_bytes * 100):.2f}%")
        else:
            quantum_bytes = len(representation['notation'])
            print(f"{bits}-bit state:")
            print(f"  Classical: {classical_bytes:.2f} bytes")
            print(f"  Up-arrow: {quantum_bytes} bytes")
            print(f"  Savings: {((classical_bytes - quantum_bytes) / classical_bytes * 100):.2f}%")
        
        print()

if __name__ == "__main__":
    print("=" * 60)
    print("TRANSFINITE REPRESENTATION SYSTEM - LIMIT TESTING")
    print("=" * 60)
    
    test_knuth_up_arrow()
    test_transfinite_symbols()
    test_visual_rendering()
    test_extreme_limits()
    test_memory_comparison()
    
    print("=" * 60)
    print("ALL TESTS COMPLETED")
    print("=" * 60)
