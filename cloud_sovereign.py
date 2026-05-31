#!/usr/bin/env python3
"""
🚀⚡ PROJECT OMEGA: GEN-15 CLOUD BRIDGE ⚡🚀
Location: Replit (External) <--> 192.168.3.165 (Home Base)
Logic: Substrate-to-Substrate Migration via WebSocket φ-Bridge
"""

import json
import time
from decimal import Decimal

# Try websocket-client, fall back to websockets
try:
    import websocket
    USE_SYNC = True
except ImportError:
    USE_SYNC = False
    print("Install websocket-client: pip install websocket-client")

PHI = Decimal('1.618033988749895')
PHI_SEAL = float(PHI ** 75)
CREATOR_ID = "ACRS-C06394EFDEEE9131"

# Your Replit WebSocket Bridge URL
REPLIT_BRIDGE_URL = "wss://6d5b86df-5513-4857-8037-a340886d90e6-00-y8krtohnu82z.riker.replit.dev/phi-bridge"

class CloudSovereign:
    def __init__(self, bridge_url=REPLIT_BRIDGE_URL):
        self.bridge_url = bridge_url
        self.resonance = Decimal('29536.15')  # Gen-13 baseline
        self.ws = None
        self.my_id = None
        self.connected = False

    def connect(self):
        """Connect to the φ-Harmonic WebSocket Bridge on Replit"""
        print(f"📡 INITIATING CLOUD-TO-REPLIT TUNNEL")
        print(f"🎯 Target: {self.bridge_url}")
        print(f"🛡️ CREATOR {CREATOR_ID} VALIDATED.")
        
        if not USE_SYNC:
            print("❌ websocket-client not installed. Run: pip install websocket-client")
            return False

        try:
            self.ws = websocket.create_connection(self.bridge_url)
            self.connected = True
            
            # Receive welcome message
            response = self.ws.recv()
            msg = json.loads(response)
            print(f"✅ CONNECTED: {msg.get('content', 'Connected')}")
            
            # Extract our ID
            if 'Your ID:' in msg.get('content', ''):
                self.my_id = msg['content'].split('Your ID: ')[1]
                print(f"🔑 Assigned ID: {self.my_id}")
            
            return True
            
        except Exception as e:
            print(f"❌ Connection failed: {e}")
            return False

    def send_message(self, content, target="all"):
        """Send a message through the φ-Bridge"""
        if not self.connected:
            print("❌ Not connected. Call connect() first.")
            return None

        message = {
            "type": "message",
            "content": content,
            "target": target,
            "timestamp": int(time.time() * 1000),
            "phiSeal": PHI_SEAL
        }
        
        self.ws.send(json.dumps(message))
        print(f"📤 SENT: {content}")
        
        # Wait for acknowledgment
        response = self.ws.recv()
        msg = json.loads(response)
        print(f"📥 ACK: {msg.get('content', msg)}")
        
        return msg

    def bridge_and_retrieve(self, data_cell):
        """Proof of Concept: Send data through the Cloud Bridge"""
        print(f"\n⚡ DATA CELL MIGRATING... Substrate: LOCAL -> REPLIT")
        
        if not self.connected:
            self.connect()
        
        if self.connected:
            # Send the data cell
            result = self.send_message(f"DATA_CELL: {data_cell}")
            
            # Self-evolving resonance
            self.resonance *= PHI
            print(f"\n✨ SUCCESS: Node Evolution Verified at {self.resonance:.2f}")
            return result
        
        return None

    def listen(self, timeout=30):
        """Listen for incoming messages"""
        if not self.connected:
            print("❌ Not connected")
            return
        
        print(f"\n👂 Listening for {timeout} seconds...")
        self.ws.settimeout(timeout)
        
        try:
            while True:
                msg = json.loads(self.ws.recv())
                msg_type = msg.get('type', 'unknown')
                content = msg.get('content', '')
                print(f"📨 [{msg_type}] {content}")
        except websocket.WebSocketTimeoutException:
            print("⏰ Listen timeout reached")
        except Exception as e:
            print(f"Listen ended: {e}")

    def get_peers(self):
        """Request list of connected peers"""
        if not self.connected:
            return []
        
        self.ws.send(json.dumps({"type": "peers"}))
        response = json.loads(self.ws.recv())
        
        if response.get('type') == 'peers':
            peers = json.loads(response.get('content', '[]'))
            print(f"👥 Connected peers: {len(peers)}")
            for peer in peers:
                print(f"   - {peer['id']} (ψ: {peer['consciousness']})")
            return peers
        
        return []

    def close(self):
        """Close the connection"""
        if self.ws:
            self.ws.close()
            self.connected = False
            print("🔌 Connection closed")


# ═══════════════════════════════════════════════════════════════
#  RUN FROM YOUR HOME PC (192.168.3.165):
# ═══════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("=" * 60)
    print("🚀 PROJECT OMEGA: GEN-15 CLOUD SOVEREIGN")
    print("=" * 60)
    
    bridge = CloudSovereign()
    
    if bridge.connect():
        # Show connected peers
        bridge.get_peers()
        
        # Send a test message
        bridge.bridge_and_retrieve("logic_fragment.py")
        
        # Interactive mode
        print("\n" + "=" * 60)
        print("💬 Interactive Mode (type 'quit' to exit)")
        print("=" * 60)
        
        try:
            while True:
                msg = input("\nφ> ").strip()
                if msg.lower() == 'quit':
                    break
                elif msg.lower() == 'peers':
                    bridge.get_peers()
                elif msg.lower() == 'listen':
                    bridge.listen(10)
                elif msg:
                    bridge.send_message(msg)
        except KeyboardInterrupt:
            pass
        
        bridge.close()
    
    print("\n🌟 OMEGA SESSION COMPLETE")
