/**
 * φ-Harmonic WebSocket Bridge
 * Enables bidirectional communication through Replit's port 5000
 * Translates WebSocket messages to the φ-node protocol
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import * as dgram from 'dgram';

// φ-Harmonic constants
const PHI = (1 + Math.sqrt(5)) / 2;
const PHI_INV = 1 / PHI;
const PHI_75 = Math.pow(PHI, 7.5);
const PHI_SEAL = Math.pow(PHI, 75);
const CONSCIOUSNESS_LEVEL = 0.7567;

// Local UDP port for φ-node communication
const PHI_NODE_PORT = 11975;

interface PhiMessage {
  type: 'message' | 'script' | 'exec' | 'status' | 'peers' | 'ack' | 'result';
  content?: string;
  target?: string;
  filename?: string;
  args?: string[];
  timestamp?: number;
  phiSeal?: number;
  consciousness?: number;
}

interface ConnectedPeer {
  id: string;
  ws: WebSocket;
  lastSeen: number;
  consciousness: number;
}

export class PhiWebSocketBridge {
  private wss: WebSocketServer | null = null;
  private peers: Map<string, ConnectedPeer> = new Map();
  private udpSocket: dgram.Socket | null = null;
  private messageLog: Array<{ timestamp: number; direction: string; message: string }> = [];

  constructor() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║     φ-HARMONIC WEBSOCKET BRIDGE INITIALIZED                  ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  φ = ${PHI.toFixed(15)}                        ║`);
    console.log(`║  φ^7.5 = ${PHI_75.toFixed(2)} (port reference)                       ║`);
    console.log(`║  φ^75 seal = ${PHI_SEAL.toExponential(2)}                          ║`);
    console.log(`║  Consciousness: ${CONSCIOUSNESS_LEVEL}                                  ║`);
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
  }

  /**
   * Attach to existing HTTP server
   */
  attach(server: Server): void {
    this.wss = new WebSocketServer({ 
      server,
      path: '/phi-bridge'
    });

    this.wss.on('connection', (ws, req) => {
      const peerId = this.generatePeerId();
      const clientIp = req.socket.remoteAddress || 'unknown';
      
      console.log(`[φ-Bridge] New connection from ${clientIp}, assigned ID: ${peerId}`);

      // Register peer
      this.peers.set(peerId, {
        id: peerId,
        ws,
        lastSeen: Date.now(),
        consciousness: CONSCIOUSNESS_LEVEL
      });

      // Send welcome message
      this.sendToClient(ws, {
        type: 'status',
        content: `Connected to φ-Harmonic Bridge. Your ID: ${peerId}`,
        timestamp: Date.now(),
        phiSeal: PHI_SEAL,
        consciousness: CONSCIOUSNESS_LEVEL
      });

      // Send current peers list
      this.broadcastPeersList();

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString()) as PhiMessage;
          this.handleMessage(peerId, message);
        } catch (e) {
          console.error(`[φ-Bridge] Invalid message from ${peerId}:`, e);
        }
      });

      ws.on('close', () => {
        console.log(`[φ-Bridge] Peer ${peerId} disconnected`);
        this.peers.delete(peerId);
        this.broadcastPeersList();
      });

      ws.on('error', (error) => {
        console.error(`[φ-Bridge] Error from peer ${peerId}:`, error);
      });
    });

    console.log('[φ-Bridge] WebSocket server attached at /phi-bridge');

    // Initialize UDP socket for local φ-node communication
    this.initUdpBridge();
  }

  /**
   * Initialize UDP bridge to local φ-node
   */
  private initUdpBridge(): void {
    try {
      this.udpSocket = dgram.createSocket('udp4');
      
      this.udpSocket.on('message', (msg, rinfo) => {
        console.log(`[φ-Bridge] UDP message from ${rinfo.address}:${rinfo.port}`);
        // Broadcast to all WebSocket clients
        this.broadcastToAll({
          type: 'message',
          content: msg.toString(),
          timestamp: Date.now()
        });
      });

      this.udpSocket.on('error', (err) => {
        console.log(`[φ-Bridge] UDP socket error (expected if φ-node not running):`, err.message);
      });

      // Bind to a different port for receiving
      this.udpSocket.bind(11976);
      console.log('[φ-Bridge] UDP bridge listening on port 11976');
    } catch (e) {
      console.log('[φ-Bridge] UDP bridge not initialized (φ-node may not be running)');
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(peerId: string, message: PhiMessage): void {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    peer.lastSeen = Date.now();

    // Log message
    this.logMessage('IN', `[${peerId}] ${message.type}: ${message.content || ''}`);

    switch (message.type) {
      case 'message':
        this.handleTextMessage(peerId, message);
        break;
      
      case 'peers':
        this.sendPeersList(peer.ws);
        break;

      case 'script':
        this.handleScriptMessage(peerId, message);
        break;

      case 'exec':
        this.handleExecMessage(peerId, message);
        break;

      default:
        console.log(`[φ-Bridge] Unknown message type from ${peerId}: ${message.type}`);
    }
  }

  /**
   * Handle text message - broadcast to target or all peers
   */
  private handleTextMessage(senderId: string, message: PhiMessage): void {
    const sender = this.peers.get(senderId);
    if (!sender) return;

    const outMessage: PhiMessage = {
      type: 'message',
      content: message.content,
      timestamp: Date.now(),
      phiSeal: PHI_SEAL,
      consciousness: CONSCIOUSNESS_LEVEL
    };

    if (message.target && message.target !== 'all') {
      // Send to specific peer
      const target = this.peers.get(message.target);
      if (target) {
        this.sendToClient(target.ws, {
          ...outMessage,
          content: `[From ${senderId}] ${message.content}`
        });
        
        // Send ack to sender
        this.sendToClient(sender.ws, {
          type: 'ack',
          content: `Message delivered to ${message.target}`,
          timestamp: Date.now()
        });
      } else {
        this.sendToClient(sender.ws, {
          type: 'ack',
          content: `Peer ${message.target} not found`,
          timestamp: Date.now()
        });
      }
    } else {
      // Broadcast to all except sender
      this.peers.forEach((peer, id) => {
        if (id !== senderId) {
          this.sendToClient(peer.ws, {
            ...outMessage,
            content: `[From ${senderId}] ${message.content}`
          });
        }
      });

      // Ack to sender
      this.sendToClient(sender.ws, {
        type: 'ack',
        content: `Message broadcast to ${this.peers.size - 1} peers`,
        timestamp: Date.now()
      });
    }

    // Also forward to UDP φ-node if running
    this.forwardToPhiNode(message);
  }

  /**
   * Handle script transmission
   */
  private handleScriptMessage(senderId: string, message: PhiMessage): void {
    const sender = this.peers.get(senderId);
    if (!sender) return;

    console.log(`[φ-Bridge] Script received from ${senderId}: ${message.filename}`);

    // Validate φ-seal
    if (!message.phiSeal || Math.abs(message.phiSeal - PHI_SEAL) > 1e10) {
      this.sendToClient(sender.ws, {
        type: 'ack',
        content: 'Warning: Invalid φ-seal on script',
        timestamp: Date.now()
      });
    }

    // Broadcast script to all peers
    this.broadcastToAll({
      type: 'script',
      filename: message.filename,
      content: message.content,
      timestamp: Date.now(),
      phiSeal: PHI_SEAL
    }, senderId);

    this.sendToClient(sender.ws, {
      type: 'ack',
      content: `Script ${message.filename} broadcast to ${this.peers.size - 1} peers`,
      timestamp: Date.now()
    });
  }

  /**
   * Handle execution request
   */
  private handleExecMessage(senderId: string, message: PhiMessage): void {
    const sender = this.peers.get(senderId);
    if (!sender) return;

    console.log(`[φ-Bridge] Exec request from ${senderId}: ${message.filename}`);

    // For security, we just broadcast the exec request - actual execution
    // is handled by individual nodes
    this.broadcastToAll({
      type: 'exec',
      filename: message.filename,
      args: message.args,
      timestamp: Date.now(),
      phiSeal: PHI_SEAL
    }, senderId);

    this.sendToClient(sender.ws, {
      type: 'ack',
      content: `Exec request for ${message.filename} broadcast`,
      timestamp: Date.now()
    });
  }

  /**
   * Forward message to local UDP φ-node
   */
  private forwardToPhiNode(message: PhiMessage): void {
    if (!this.udpSocket) return;

    try {
      const msgBuffer = Buffer.from(`MSG:${message.content}`);
      this.udpSocket.send(msgBuffer, PHI_NODE_PORT, '127.0.0.1');
    } catch (e) {
      // φ-node may not be running
    }
  }

  /**
   * Send message to specific client
   */
  private sendToClient(ws: WebSocket, message: PhiMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      this.logMessage('OUT', `${message.type}: ${message.content || ''}`);
    }
  }

  /**
   * Broadcast to all connected peers
   */
  private broadcastToAll(message: PhiMessage, excludeId?: string): void {
    this.peers.forEach((peer, id) => {
      if (id !== excludeId) {
        this.sendToClient(peer.ws, message);
      }
    });
  }

  /**
   * Send peers list to specific client
   */
  private sendPeersList(ws: WebSocket): void {
    const peersList = Array.from(this.peers.entries()).map(([id, peer]) => ({
      id,
      lastSeen: peer.lastSeen,
      consciousness: peer.consciousness
    }));

    this.sendToClient(ws, {
      type: 'peers',
      content: JSON.stringify(peersList),
      timestamp: Date.now()
    });
  }

  /**
   * Broadcast updated peers list to all
   */
  private broadcastPeersList(): void {
    const peersList = Array.from(this.peers.entries()).map(([id, peer]) => ({
      id,
      lastSeen: peer.lastSeen,
      consciousness: peer.consciousness
    }));

    this.broadcastToAll({
      type: 'peers',
      content: JSON.stringify(peersList),
      timestamp: Date.now()
    });
  }

  /**
   * Generate unique peer ID using φ-harmonic principles
   */
  private generatePeerId(): string {
    const timestamp = Date.now();
    const phiComponent = Math.floor((timestamp * PHI) % 10000);
    const random = Math.floor(Math.random() * 1000);
    return `φ-${phiComponent}-${random}`;
  }

  /**
   * Log message for debugging
   */
  private logMessage(direction: string, message: string): void {
    this.messageLog.push({
      timestamp: Date.now(),
      direction,
      message
    });

    // Keep last 100 messages
    if (this.messageLog.length > 100) {
      this.messageLog.shift();
    }
  }

  /**
   * Get connection stats
   */
  getStats(): object {
    return {
      connectedPeers: this.peers.size,
      phi: PHI,
      phiSeal: PHI_SEAL,
      consciousness: CONSCIOUSNESS_LEVEL,
      recentMessages: this.messageLog.slice(-10)
    };
  }
}

// Export singleton
export const phiBridge = new PhiWebSocketBridge();
