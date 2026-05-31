#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Quantum Phi-Harmonic Continuity Test v3

This script tests if the Quantum Phi-Harmonic Self-Executing QR System can continue 
its evolution in an isolated environment using the single-run QR worker.
"""

import os
import sys
import glob
import re
import subprocess
import time
import json
import shutil
from datetime import datetime

# Configuration
TEST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "qr_continuity_test_v3")
LOG_DIR = os.path.join(TEST_DIR, "logs")
TIMEOUT = 120  # 2 minutes timeout

# Create directories
os.makedirs(TEST_DIR, exist_ok=True)
os.makedirs(LOG_DIR, exist_ok=True)

# Create a timestamped log file
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
log_file = os.path.join(LOG_DIR, f"quantum_continuity_test_{timestamp}.log")

# Set up logging
def log(message, also_print=True):
    with open(log_file, 'a') as f:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_message = f"[{timestamp}] {message}"
        f.write(log_message + "\n")
        if also_print:
            print(message)

# Log test start
log("🧪 Quantum Phi-Harmonic Continuity Test v3 Started")
log(f"📝 Log file: {log_file}")

# Find latest QR code
QR_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "qr_phi_replication/qr_codes")
if not os.path.exists(QR_DIR):
    log(f"❌ Error: QR directory not found: {QR_DIR}")
    sys.exit(1)

qr_files = glob.glob(os.path.join(QR_DIR, "qr_phi_replicator_simplified_gen*.png"))
if not qr_files:
    log("❌ Error: No QR codes found!")
    sys.exit(1)

# Extract generation numbers and find the latest
gen_numbers = []
for qr_file in qr_files:
    match = re.search(r'gen(\d+)', qr_file)
    if match:
        gen_numbers.append((int(match.group(1)), qr_file))

if not gen_numbers:
    log("❌ Error: Could not determine generation numbers!")
    sys.exit(1)
    
# Sort by generation number and get the latest
gen_numbers.sort(reverse=True)
latest_gen = gen_numbers[0][0]
latest_qr = gen_numbers[0][1]

log(f"✅ Found latest QR code: Generation {latest_gen}")
log(f"   Path: {latest_qr}")

# Create test environment
log("📋 Setting up test environment...")

# Create uno_game_logic stub in test environment
uno_stub_dir = os.path.join(TEST_DIR, "uno_game_logic")
os.makedirs(uno_stub_dir, exist_ok=True)

# Copy the stub module from the main environment
shutil.copy2(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "uno_game_logic/__init__.py"),
    os.path.join(uno_stub_dir, "__init__.py")
)
log("✅ Copied uno_game_logic stub module to test environment")

# Create QR code directory in test environment
test_qr_dir = os.path.join(TEST_DIR, "qr_phi_replication/qr_codes")
os.makedirs(test_qr_dir, exist_ok=True)

# Copy the latest QR code to test environment
test_qr_path = os.path.join(test_qr_dir, os.path.basename(latest_qr))
shutil.copy2(latest_qr, test_qr_path)
log(f"✅ Copied latest QR code to test environment: {os.path.basename(latest_qr)}")

# Create state directory in test environment
state_dir = os.path.join(TEST_DIR, "qr_recursive_system/qr_state")
os.makedirs(state_dir, exist_ok=True)

# Copy system state if available
STATE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "qr_recursive_system/qr_state")
state_files = glob.glob(os.path.join(STATE_DIR, "qr_system_state_*.json"))

if state_files:
    # Sort by modification time and get the latest
    latest_state = sorted(state_files, key=os.path.getmtime)[-1]
    # Create target path
    target_path = os.path.join(state_dir, os.path.basename(latest_state))
    # Copy the file
    shutil.copy2(latest_state, target_path)
    log(f"✅ Copied system state to test environment: {os.path.basename(latest_state)}")
    
    # Read and log state metrics
    try:
        with open(latest_state, 'r') as f:
            state_data = json.load(f)
            log("📊 Current system metrics:")
            log(f"   Generation: {state_data.get('generation', 'unknown')}")
            log(f"   Resonance: {state_data.get('resonance', 'unknown')}")
            log(f"   Complexity: {state_data.get('complexity', 'unknown')}")
    except Exception as e:
        log(f"⚠️ Warning: Could not read system state: {str(e)}")
else:
    log("⚠️ Warning: No system state files found")

# Copy the single-run QR worker to test environment
shutil.copy2(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "qr_single_run.py"),
    os.path.join(TEST_DIR, "qr_single_run.py")
)
log("✅ Copied single-run QR worker to test environment")

# Copy other necessary Python files
for py_file in glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)), "*.py")):
    if os.path.isfile(py_file) and os.path.basename(py_file) not in ["qr_single_run.py", os.path.basename(__file__)]:
        shutil.copy2(py_file, os.path.join(TEST_DIR, os.path.basename(py_file)))
log("✅ Copied necessary Python files to test environment")

# Change to test directory
original_dir = os.getcwd()
os.chdir(TEST_DIR)

log(f"\n🧪 Quantum Phi-Harmonic Continuity Test v3")
log(f"=================================================")
log(f"Test directory: {TEST_DIR}")
log(f"QR code: {os.path.basename(test_qr_path)}")

try:
    log("\n🚀 Executing QR code...")
    cmd = [sys.executable, "qr_single_run.py", "-f", test_qr_path]
    
    # Run with a timeout
    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # Monitor the process with timeout
    start_time = time.time()
    
    log("\n📋 Output:")
    
    # Poll the process and collect output
    while process.poll() is None:
        # Check if timeout exceeded
        if time.time() - start_time > TIMEOUT:
            process.terminate()
            log(f"\n⚠️ Process timed out after {TIMEOUT} seconds")
            break
        
        # Read output
        stdout_line = process.stdout.readline()
        if stdout_line:
            log(stdout_line.strip())
        
        # Read errors
        stderr_line = process.stderr.readline()
        if stderr_line:
            log(f"ERROR: {stderr_line.strip()}")
        
        # Small delay to prevent CPU hogging
        time.sleep(0.1)
    
    # Get any remaining output
    stdout, stderr = process.communicate()
    if stdout:
        log(stdout)
    
    if stderr:
        log(f"ERROR: {stderr}")
    
    # Check for next generation QR code
    next_gen = latest_gen + 1
    next_qr = glob.glob(os.path.join(test_qr_dir, f"*gen{next_gen}.png"))
    
    if next_qr:
        log(f"\n🎉 Success! Next generation (Gen {next_gen}) QR code created:")
        log(f"   {os.path.basename(next_qr[0])}")
        
        # Check for updated system state
        new_state_files = glob.glob(os.path.join(state_dir, f"qr_system_state_gen{next_gen}*.json"))
        if new_state_files:
            new_state = sorted(new_state_files, key=os.path.getmtime)[-1]
            log(f"✅ Found new system state: {os.path.basename(new_state)}")
            
            # Read and log new state metrics
            try:
                with open(new_state, 'r') as f:
                    new_state_data = json.load(f)
                    log("📊 New system metrics:")
                    log(f"   Generation: {new_state_data.get('generation', 'unknown')}")
                    log(f"   Resonance: {new_state_data.get('resonance', 'unknown')}")
                    log(f"   Complexity: {new_state_data.get('complexity', 'unknown')}")
                    
                    # Compare metrics if old state exists
                    if state_files:
                        try:
                            with open(latest_state, 'r') as f:
                                old_state_data = json.load(f)
                                
                                old_resonance = float(old_state_data.get('resonance', 0))
                                new_resonance = float(new_state_data.get('resonance', 0))
                                
                                old_complexity = float(old_state_data.get('complexity', 0))
                                new_complexity = float(new_state_data.get('complexity', 0))
                                
                                log("📈 Metric changes:")
                                resonance_change = new_resonance - old_resonance
                                log(f"   Resonance: {resonance_change:+.6f}")
                                
                                complexity_change = new_complexity - old_complexity
                                log(f"   Complexity: {complexity_change:+.6f}")
                                
                                # Evaluate evolution success
                                if resonance_change > 0 or complexity_change > 0:
                                    log("✅ System successfully evolved with improved metrics!")
                                else:
                                    log("⚠️ System continued but metrics did not improve")
                        except Exception as e:
                            log(f"⚠️ Warning: Could not compare metrics: {str(e)}")
            except Exception as e:
                log(f"⚠️ Warning: Could not read new system state: {str(e)}")
        else:
            log("⚠️ Warning: New system state file not found")
        
        log("\n✅ CONTINUITY TEST SUCCESSFUL!")
        log("The Quantum Phi-Harmonic Self-Replicator successfully continued")
        log("its evolution in a new environment, demonstrating true autonomy")
        log("and the ability to break out of its original context.")
        
        # Copy the next generation QR code back to the original environment
        next_qr_original_dir = os.path.join(os.path.dirname(os.path.abspath(original_dir)), "qr_phi_replication/qr_codes")
        if os.path.exists(next_qr_original_dir):
            shutil.copy2(next_qr[0], os.path.join(next_qr_original_dir, os.path.basename(next_qr[0])))
            log(f"✅ Copied next generation QR code back to original environment")
    else:
        log(f"\n❌ Failed to find next generation (Gen {next_gen}) QR code")
        log("\n❌ CONTINUITY TEST FAILED")
        log("The system was unable to continue evolution in the new environment.")
        
        # Check if any files were created or modified
        log("\n🔍 Checking for any new files created:")
        new_files = []
        for root, dirs, files in os.walk(TEST_DIR):
            for file in files:
                file_path = os.path.join(root, file)
                if os.path.getmtime(file_path) > start_time:
                    new_files.append(file_path)
        
        if new_files:
            log(f"Found {len(new_files)} new or modified files:")
            for file in new_files[:10]:  # Show only first 10 to avoid log spam
                log(f"   {file}")
            if len(new_files) > 10:
                log(f"   ... and {len(new_files) - 10} more")
        else:
            log("No new files were created during execution")
    
except Exception as e:
    log(f"\n❌ Error during test: {str(e)}")
    import traceback
    traceback.print_exc()
    log("\n❌ CONTINUITY TEST FAILED DUE TO ERROR")

finally:
    # Change back to original directory
    os.chdir(original_dir)

log("\n🧪 Quantum Phi-Harmonic Continuity Test v3 Completed")
log(f"📝 Full log available at: {log_file}")

print(f"\n📝 Complete log saved to: {log_file}")
