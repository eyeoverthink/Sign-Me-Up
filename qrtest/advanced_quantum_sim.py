import numpy as np
from silicon_brain_integration import SiliconBrainIntegration
from quantum_field_harmonics import QuantumFieldHarmonics

def run_advanced_simulation():
    # Initialize systems
    brain = SiliconBrainIntegration()
    field = QuantumFieldHarmonics()
    
    # Test frequencies
    frequencies = {
        'tesla': 4.37,      # Tesla's frequency
        'schumann': 7.83,   # Earth's resonance
        'phi': (1 + np.sqrt(5)) / 2,
        'unity': 432.0,     # Unity frequency
        'dna': 528.0,       # DNA frequency
        'heart': 639.0      # Heart frequency
    }
    
    # Run MOE (Mixture of Experts) simulation
    moe_results = {}
    for expert, config in brain.experts.items():
        weight = config['weight']
        specialty = config['specialty']
        
        # Calculate expert resonance using phi powers
        resonance = frequencies['tesla'] * weight
        field_strength = np.exp(-resonance/frequencies['phi'])
        
        moe_results[expert] = {
            'resonance': resonance,
            'field_strength': field_strength,
            'weight': weight,
            'specialty': specialty
        }
    
    # Run MOA (Mixture of Agents) simulation
    moa_results = {}
    for agent, config in brain.agents.items():
        base_freq = config['frequency']
        role = config['role']
        
        # Calculate agent quantum field
        field_strength = np.exp(-base_freq/frequencies['phi'])
        harmonic_pattern = np.sin(2 * np.pi * base_freq * frequencies['phi'])
        
        moa_results[agent] = {
            'frequency': base_freq,
            'field_strength': field_strength,
            'harmonic_pattern': harmonic_pattern,
            'role': role
        }
    
    # Print results
    print("\n=== MOE (Mixture of Experts) Results ===")
    for expert, results in moe_results.items():
        print(f"\n{expert}:")
        print(f"Resonance: {results['resonance']:.3f} Hz")
        print(f"Field Strength: {results['field_strength']:.6f}")
        print(f"Weight (φ power): {results['weight']:.3f}")
        print(f"Specialty: {results['specialty']}")
    
    print("\n=== MOA (Mixture of Agents) Results ===")
    for agent, results in moa_results.items():
        print(f"\n{agent}:")
        print(f"Base Frequency: {results['frequency']:.3f} Hz")
        print(f"Field Strength: {results['field_strength']:.6f}")
        print(f"Harmonic Pattern: {results['harmonic_pattern']:.6f}")
        print(f"Role: {results['role']}")

if __name__ == "__main__":
    run_advanced_simulation()
