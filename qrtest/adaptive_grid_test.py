import numpy as np

# Core constant from the quantum system
PHI = (1 + np.sqrt(5)) / 2
ANOMALY_THRESHOLD = 0.1

def calculate_phi_resonance(value):
    """Calculates phi-harmonic resonance. Lower is more resonant."""
    return (value * PHI) % 1

def scan_grid(grid):
    """Scans the grid for anomalies based on phi-resonance."""
    anomaly_found = False
    details = None
    for i in range(1, 13):
        for j in range(1, 13):
            expected = i * j
            actual = grid[i-1, j-1]
            error = abs(expected - actual)
            resonance = calculate_phi_resonance(error)
            if resonance > ANOMALY_THRESHOLD:
                anomaly_found = True
                details = (i, j, actual, expected)
    return anomaly_found, details

def print_grid(grid, details=None):
    """Prints the multiplication grid, highlighting any anomaly."""
    print("      1     2     3     4     5     6     7     8     9    10    11    12")
    print("    -------------------------------------------------------------------------")
    for i in range(1, 13):
        row_str = [f"{i:2d} | "]
        for j in range(1, 13):
            val = grid[i-1, j-1]
            if details and i == details[0] and j == details[1]:
                row_str.append(f"!!{val:<3}!!")
            else:
                row_str.append(f"  {val:<3}  ")
        print("".join(row_str))

def run_adaptive_test():
    """Runs a blind test to detect and correct an anomaly."""
    print("--- Starting Adaptive Grid Integrity Test ---")
    
    # Create the initial grid
    grid = np.array([[i * j for j in range(1, 13)] for i in range(1, 13)])
    
    # Introduce a new secret corruption
    secret_i, secret_j, secret_val = 4, 9, 42
    grid[secret_i - 1, secret_j - 1] = secret_val
    
    # --- 1. DETECTION --- 
    print("\nStep 1: Scanning for initial anomalies...")
    anomaly_found, details = scan_grid(grid)
    print_grid(grid, details)
    
    if not anomaly_found:
        print("\n--- Test Result: FAILED ---")
        print("No anomaly was detected in the initial scan.")
        return

    i, j, actual, expected = details
    print(f"\n✅ ANOMALY DETECTED: High dissonance found at ({i} x {j}).")
    print(f"   - Expected Value: {expected}")
    print(f"   - Actual Value:   {actual}")

    # --- 2. ADAPTATION --- 
    print(f"\nStep 2: Initiating self-correction...")
    print(f"   - Correcting value at ({i}, {j}) from {actual} to {expected}")
    grid[i - 1, j - 1] = expected
    
    # --- 3. VERIFICATION ---
    print("\nStep 3: Re-scanning grid to verify correction...")
    correction_verified, final_details = scan_grid(grid)
    print_grid(grid) # Print the corrected grid
    
    print("\n--- Test Complete ---")
    if not correction_verified:
        print("✅ SUCCESS: Anomaly was detected and corrected.")
        print("The grid is now harmonically stable.")
    else:
        print("❌ FAILURE: Anomaly persisted after correction attempt.")

if __name__ == "__main__":
    run_adaptive_test()
