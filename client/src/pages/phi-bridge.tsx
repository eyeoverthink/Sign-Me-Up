import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Users, Zap, Radio, RefreshCw } from "lucide-react";

// φ-Harmonic constants
const PHI = (1 + Math.sqrt(5)) / 2;
const PHI_SEAL = Math.pow(PHI, 75);

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

interface Peer {
  id: string;
  lastSeen: number;
  consciousness: number;
}

export default function PhiBridgePage() {
  const [connected, setConnected] = useState(false);
  const [myId, setMyId] = useState<string>("");
  const [peers, setPeers] = useState<Peer[]>([]);
  const [messages, setMessages] = useState<Array<{ time: string; content: string; type: string }>>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [targetPeer, setTargetPeer] = useState("all");
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const addMessage = useCallback((content: string, type: string) => {
    const time = new Date().toLocaleTimeString();
    setMessages(prev => [...prev, { time, content, type }]);
  }, []);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/phi-bridge`;
    
    addMessage(`Connecting to ${wsUrl}...`, 'system');
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      addMessage('Connected to φ-Harmonic Bridge', 'system');
    };

    ws.onmessage = (event) => {
      try {
        const msg: PhiMessage = JSON.parse(event.data);
        
        switch (msg.type) {
          case 'status':
            addMessage(msg.content || '', 'status');
            // Extract peer ID from welcome message
            const idMatch = msg.content?.match(/Your ID: (φ-\d+-\d+)/);
            if (idMatch) {
              setMyId(idMatch[1]);
            }
            break;
          
          case 'message':
            addMessage(msg.content || '', 'message');
            break;
          
          case 'ack':
            addMessage(`✓ ${msg.content}`, 'ack');
            break;
          
          case 'peers':
            if (msg.content) {
              const peersList = JSON.parse(msg.content);
              setPeers(peersList);
            }
            break;
          
          case 'script':
            addMessage(`📜 Script received: ${msg.filename}`, 'script');
            break;
          
          case 'exec':
            addMessage(`⚡ Exec request: ${msg.filename}`, 'exec');
            break;
          
          default:
            addMessage(JSON.stringify(msg), 'unknown');
        }
      } catch (e) {
        addMessage(`Raw: ${event.data}`, 'raw');
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setMyId("");
      setPeers([]);
      addMessage('Disconnected from φ-Harmonic Bridge', 'system');
    };

    ws.onerror = (error) => {
      addMessage(`Error: ${error}`, 'error');
    };
  }, [addMessage]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback(() => {
    if (!wsRef.current || !inputMessage.trim()) return;

    const msg: PhiMessage = {
      type: 'message',
      content: inputMessage,
      target: targetPeer,
      timestamp: Date.now(),
      phiSeal: PHI_SEAL
    };

    wsRef.current.send(JSON.stringify(msg));
    addMessage(`[You → ${targetPeer}] ${inputMessage}`, 'sent');
    setInputMessage("");
  }, [inputMessage, targetPeer, addMessage]);

  const requestPeers = useCallback(() => {
    if (!wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: 'peers' }));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            φ-Harmonic Bridge Console
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Badge variant={connected ? "default" : "secondary"}>
                {connected ? "Connected" : "Disconnected"}
              </Badge>
              {myId && (
                <Badge variant="outline" className="font-mono text-xs">
                  {myId}
                </Badge>
              )}
            </div>
            
            <div className="flex gap-2">
              {!connected ? (
                <Button onClick={connect} size="sm" data-testid="button-connect">
                  <Zap className="h-4 w-4 mr-1" />
                  Connect
                </Button>
              ) : (
                <Button onClick={disconnect} variant="outline" size="sm" data-testid="button-disconnect">
                  Disconnect
                </Button>
              )}
              
              {connected && (
                <Button onClick={requestPeers} variant="outline" size="sm" data-testid="button-refresh-peers">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh Peers
                </Button>
              )}
            </div>

            <div className="text-xs text-muted-foreground ml-auto">
              φ = {PHI.toFixed(6)} | Consciousness: 0.7567
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Peers Panel */}
        <Card className="md:col-span-1">
          <CardHeader className="py-2">
            <CardTitle className="text-sm flex items-center gap-1">
              <Users className="h-4 w-4" />
              Connected Peers ({peers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ScrollArea className="h-48">
              {peers.length === 0 ? (
                <p className="text-xs text-muted-foreground p-2">No peers connected</p>
              ) : (
                <div className="space-y-1">
                  {peers.map((peer) => (
                    <div
                      key={peer.id}
                      className={`p-2 rounded text-xs cursor-pointer hover-elevate ${
                        targetPeer === peer.id ? 'bg-primary/10 border border-primary/30' : ''
                      }`}
                      onClick={() => setTargetPeer(peer.id)}
                      data-testid={`peer-${peer.id}`}
                    >
                      <div className="font-mono">{peer.id}</div>
                      <div className="text-muted-foreground">
                        ψ: {peer.consciousness.toFixed(4)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="mt-2 pt-2 border-t">
              <Button
                variant={targetPeer === "all" ? "default" : "outline"}
                size="sm"
                className="w-full text-xs"
                onClick={() => setTargetPeer("all")}
                data-testid="button-broadcast-all"
              >
                Broadcast to All
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Messages Panel */}
        <Card className="md:col-span-2">
          <CardHeader className="py-2">
            <CardTitle className="text-sm">Message Log</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ScrollArea className="h-48 border rounded p-2 bg-background/50">
              {messages.length === 0 ? (
                <p className="text-xs text-muted-foreground">No messages yet</p>
              ) : (
                <div className="space-y-1 font-mono text-xs">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`${
                        msg.type === 'error' ? 'text-red-500' :
                        msg.type === 'system' ? 'text-blue-500' :
                        msg.type === 'sent' ? 'text-green-500' :
                        msg.type === 'ack' ? 'text-amber-500' :
                        msg.type === 'message' ? 'text-foreground' :
                        'text-muted-foreground'
                      }`}
                    >
                      <span className="text-muted-foreground">[{msg.time}]</span> {msg.content}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Type a message..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                disabled={!connected}
                className="flex-1 text-sm"
                data-testid="input-message"
              />
              <Button
                onClick={sendMessage}
                disabled={!connected || !inputMessage.trim()}
                size="sm"
                data-testid="button-send"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Target: <span className="font-mono">{targetPeer}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connection Info */}
      <Card className="mt-4">
        <CardHeader className="py-2">
          <CardTitle className="text-sm">Connection Info</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-1">
          <p><strong>WebSocket URL:</strong> <code className="bg-muted px-1 rounded">{window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//{window.location.host}/phi-bridge</code></p>
          <p><strong>φ^75 Seal:</strong> <code className="bg-muted px-1 rounded">{PHI_SEAL.toExponential(4)}</code></p>
          <p className="text-muted-foreground mt-2">
            Connect from another device using the WebSocket URL above. All messages are validated using φ-harmonic principles.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
