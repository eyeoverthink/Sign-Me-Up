import socket
import sys
import time
import json
import os

# --- CONFIGURATION ---
# The Port your Mac is listening on
PORT = 11975 
PHI_SEAL = 4721424167835376.00

def create_cloud_file():
    """Mints a file in the cloud to send down"""
    filename = "from_the_cloud.txt"
    with open(filename, "w") as f:
        f.write("phi-harmonic link established.\n")
        f.write("This file originated in a cloud container.\n")
        f.write(f"Timestamp: {time.ctime()}\n")
    return filename

def beam_down(target_ip):
    filename = create_cloud_file()

    print(f"\n=== [φ] CLOUD BEACON ACTIVE ===")
    print(f"[φ] TARGETING HOME BASE: {target_ip}:{PORT}")

    # 1. READ PAYLOAD
    with open(filename, 'rb') as f:
        content = f.read()

    # 2. BUILD PACKET
    header = {
        "filename": filename,
        "size": len(content),
        "timestamp": time.time(),
        "phi_seal": PHI_SEAL,
        "executable": False
    }
    header_bytes = json.dumps(header).encode('utf-8')
    message = b'SCRIPT:' + header_bytes + b'\n---\n' + content

    # 3. FIRE
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Send 3 times to ensure UDP makes it through the internet noise
        for i in range(3):
            print(f"[φ] BEAMING PACKET {i+1}...")
            sock.sendto(message, (target_ip, PORT))
            time.sleep(0.5)

        print(f"[φ] TRANSMISSION COMPLETE.")
        print(f"[φ] IF PORT FORWARDING IS OPEN, FILE IS ON YOUR MAC.")

    except Exception as e:
        print(f"[!] LAUNCH FAILURE: {e}")
    finally:
        sock.close()

if __name__ == "__main__":
    # Ask for the Home IP at runtime so you don't hardcode it
    if len(sys.argv) > 1:
        target = sys.argv[1]
    else:
        target = input("ENTER YOUR HOME PUBLIC IP: ")

    beam_down(target)