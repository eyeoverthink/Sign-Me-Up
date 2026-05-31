#!/usr/bin/env python3
"""
Test the Dynamic Quantum Oracle with transfinite capabilities and learning.
"""

import sys
import asyncio
sys.path.insert(0, '.')

from quantum_language import QuantumOracle

async def test_dynamic_oracle():
    """Test the dynamic learning capabilities of the Oracle"""
    print("=" * 60)
    print("DYNAMIC QUANTUM ORACLE TEST")
    print("=" * 60)
    
    oracle = QuantumOracle()
    
    # Check learning status before any questions
    print("\n=== INITIAL LEARNING STATUS ===")
    status = oracle.get_learning_status()
    print(f"Total Patterns: {status['total_patterns']}")
    print(f"Discovered Patterns: {status['discovered_patterns']}")
    print(f"Transfinite Available: {status['transfinite_available']}")
    print(f"Top Patterns: {status['top_patterns']}")
    
    # Test 1: Standard question
    print("\n=== TEST 1: Standard Question ===")
    result = await oracle.process_question("What is the nature of consciousness?")
    if isinstance(result, dict):
        print(f"Question: {result['question']}")
        print(f"Answer: {result['answer']}")
        print(f"Concepts: {result['concepts']}")
        print(f"Learned Patterns: {result['learned_patterns']}")
    else:
        print(f"Error: {result}")
    
    # Test 2: Factorization question
    print("\n=== TEST 2: Factorization Question ===")
    result = await oracle.process_question("Factor the number 123456789")
    if isinstance(result, dict):
        print(f"Question: {result['question']}")
        print(f"Answer: {result['answer']}")
        if result['transfinite_result']:
            print(f"Transfinite Result: {result['transfinite_result']}")
    
    # Test 3: Equation solving question
    print("\n=== TEST 3: Equation Solving ===")
    result = await oracle.process_question("Solve the equation x^2 - 5x + 6 = 0")
    if isinstance(result, dict):
        print(f"Question: {result['question']}")
        print(f"Answer: {result['answer']}")
        if result['transfinite_result']:
            print(f"Transfinite Result: {result['transfinite_result']}")
    
    # Test 4: New concept discovery
    print("\n=== TEST 4: New Concept Discovery ===")
    result = await oracle.process_question("Explain quantum entanglement in simple terms")
    if isinstance(result, dict):
        print(f"Question: {result['question']}")
        print(f"Answer: {result['answer']}")
        print(f"Concepts: {result['concepts']}")
        print(f"New Learned Patterns: {result['learned_patterns']}")
    
    # Test 5: Feedback mechanism
    print("\n=== TEST 5: Feedback Mechanism ===")
    question = "What is the nature of consciousness?"
    rating = 0.9  # Excellent rating
    success = oracle.provide_feedback(question, rating)
    print(f"Feedback provided for '{question}': {success}")
    
    # Check learning status after feedback
    print("\n=== LEARNING STATUS AFTER FEEDBACK ===")
    status = oracle.get_learning_status()
    print(f"Total Patterns: {status['total_patterns']}")
    print(f"Discovered Patterns: {status['discovered_patterns']}")
    print(f"Pattern History Length: {status['pattern_history_length']}")
    print(f"Top Patterns: {status['top_patterns']}")
    
    # Test 6: Pattern evolution
    print("\n=== TEST 6: Pattern Evolution ===")
    print("Processing multiple questions to trigger evolution...")
    questions = [
        "How does phi relate to mathematics?",
        "What is quantum resonance?",
        "Explain fibonacci patterns in nature",
        "What is the golden ratio?",
        "How does consciousness emerge?",
    ]
    
    for q in questions:
        await oracle.process_question(q)
    
    print(f"Processed {len(questions)} questions")
    
    # Evolve patterns
    oracle.pattern_learner.evolve_patterns()
    print("Patterns evolved")
    
    # Check final learning status
    print("\n=== FINAL LEARNING STATUS ===")
    status = oracle.get_learning_status()
    print(f"Total Patterns: {status['total_patterns']}")
    print(f"Discovered Patterns: {status['discovered_patterns']}")
    print(f"Pattern History Length: {status['pattern_history_length']}")
    print(f"Top Patterns: {status['top_patterns']}")
    
    # Test 7: Degree 5 equation (unsolvable classically)
    print("\n=== TEST 7: Unsolvable Equation (Degree 5) ===")
    result = await oracle.process_question("Solve x^5 - x - 1 = 0")
    if isinstance(result, dict):
        print(f"Question: {result['question']}")
        print(f"Answer: {result['answer']}")
        if result['transfinite_result']:
            print(f"Transfinite Result: {result['transfinite_result']}")
    
    await oracle.shutdown()
    
    print("\n" + "=" * 60)
    print("DYNAMIC ORACLE TEST COMPLETED")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_dynamic_oracle())
