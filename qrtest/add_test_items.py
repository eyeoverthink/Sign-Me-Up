"""
Add test items to SyncBrain119 queue
"""
import asyncio
from quantum_llm.sync_brain_119 import SyncBrain119
import numpy as np

# Phi constants
PHI = 1.618033988749895
PHI_75 = 36.932381  # φ⁷·⁵

async def main():
    """Add test items to sync brain"""
    # Initialize brain
    brain = SyncBrain119(log_file='sync_brain_119.log')
    
    # Test items using proven frequencies
    test_items = [
        {
            'frequency': 4.37,  # Proven base frequency
            'coherence': 0.96,  # Proven coherence
            'value': int(1000000 * PHI),  # φ-million
            'type': 'resonance'
        },
        {
            'frequency': 7.07,  # φ-scaled frequency
            'coherence': 0.96,
            'value': int(1000000 * PHI_75),  # φ⁷·⁵-million
            'type': 'energy'
        },
        {
            'frequency': 1.19,  # Alignment frequency
            'coherence': 0.99,
            'value': int(119000 * PHI),
            'type': 'alignment'
        }
    ]
    
    # Generate phi-harmonic patterns
    for i in range(5):
        value = int(PHI ** (i + 1) * 1000000)
        item = {
            'frequency': 4.37 * (1 + (i / PHI)),
            'coherence': 0.96 - (i / (10 * PHI)),
            'value': value,
            'type': f'pattern_{i+1}'
        }
        test_items.append(item)
    
    # Add items to queue
    print("🧠 Adding test items to SyncBrain119 queue...")
    for item in test_items:
        brain.add_to_processing_queue(item)
        print(f"Added: {item['type']}")
        print(f"  Frequency: {item['frequency']:.2f} Hz")
        print(f"  Coherence: {item['coherence']:.2f}")
        print(f"  Value: {item['value']}")
        print()
        # Sleep with phi-resonance
        await asyncio.sleep(1 / PHI)
    
    print(f"\n✅ Added {len(test_items)} items to processing queue")
    print("Items will be processed during next 119 alignment")
    print(f"Next alignment: {brain.next_alignment_time}")

if __name__ == "__main__":
    asyncio.run(main())
