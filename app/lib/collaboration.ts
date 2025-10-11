/**
 * Collaborative Editing System
 * 
 * Enables real-time collaboration using WebSockets.
 * Provides presence awareness, change synchronization, and conflict resolution.
 */

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
}

export interface Presence {
  userId: string;
  user: User;
  cursor?: { x: number; y: number };
  selection?: { clipId: string; startTime: number; endTime: number };
  lastSeen: number;
  status: 'active' | 'idle' | 'offline';
}

export interface Change {
  id: string;
  userId: string;
  timestamp: number;
  type: 'clip' | 'effect' | 'audio' | 'timeline';
  action: 'create' | 'update' | 'delete';
  data: any;
  version: number;
}

export interface ConflictResolution {
  strategy: 'last-write-wins' | 'first-write-wins' | 'merge' | 'manual';
  winner?: string;
  merged?: any;
}

/**
 * Collaboration Manager
 */
export class CollaborationManager {
  private ws: WebSocket | null = null;
  private projectId: string | null = null;
  private currentUser: User | null = null;
  private presences: Map<string, Presence> = new Map();
  private changes: Change[] = [];
  private version = 0;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  /**
   * Connect to collaboration server
   */
  async connect(projectId: string, user: User, serverUrl: string = 'ws://localhost:5173/collaborate'): Promise<void> {
    this.projectId = projectId;
    this.currentUser = user;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`${serverUrl}?projectId=${projectId}&userId=${user.userId}`);

        this.ws.onopen = () => {
          console.log('Connected to collaboration server');
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          
          // Send initial presence
          this.updatePresence({ status: 'active' });
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('Disconnected from collaboration server');
          this.stopHeartbeat();
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from collaboration server
   */
  disconnect(): void {
    if (this.ws) {
      this.updatePresence({ status: 'offline' });
      this.ws.close();
      this.ws = null;
    }
    this.stopHeartbeat();
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'presence':
          this.handlePresenceUpdate(message.data);
          break;
        case 'change':
          this.handleChange(message.data);
          break;
        case 'sync':
          this.handleSync(message.data);
          break;
        case 'conflict':
          this.handleConflict(message.data);
          break;
        case 'heartbeat':
          // Server heartbeat response
          break;
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Failed to handle message:', error);
    }
  }

  /**
   * Handle presence update
   */
  private handlePresenceUpdate(data: Presence): void {
    this.presences.set(data.userId, data);
    this.emit('presence', data);
  }

  /**
   * Handle change from other user
   */
  private handleChange(change: Change): void {
    // Check for conflicts
    if (change.version <= this.version) {
      // Potential conflict
      this.handleConflict({ change, localVersion: this.version });
      return;
    }

    // Apply change
    this.changes.push(change);
    this.version = change.version;
    this.emit('change', change);
  }

  /**
   * Handle sync request
   */
  private handleSync(data: { changes: Change[]; version: number }): void {
    this.changes = data.changes;
    this.version = data.version;
    this.emit('sync', data);
  }

  /**
   * Handle conflict
   */
  private handleConflict(data: { change: Change; localVersion: number }): void {
    const resolution = this.resolveConflict(data.change);
    this.emit('conflict', { change: data.change, resolution });
  }

  /**
   * Resolve conflict
   */
  private resolveConflict(change: Change): ConflictResolution {
    // Default: last-write-wins
    return {
      strategy: 'last-write-wins',
      winner: change.userId,
    };
  }

  /**
   * Update presence
   */
  updatePresence(update: Partial<Omit<Presence, 'userId' | 'user' | 'lastSeen'>>): void {
    if (!this.currentUser || !this.ws) return;

    const presence: Presence = {
      userId: this.currentUser.id,
      user: this.currentUser,
      lastSeen: Date.now(),
      status: 'active',
      ...update,
    };

    this.send({
      type: 'presence',
      data: presence,
    });
  }

  /**
   * Broadcast change
   */
  broadcastChange(change: Omit<Change, 'id' | 'userId' | 'timestamp' | 'version'>): void {
    if (!this.currentUser || !this.ws) return;

    const fullChange: Change = {
      ...change,
      id: this.generateId(),
      userId: this.currentUser.id,
      timestamp: Date.now(),
      version: this.version + 1,
    };

    this.changes.push(fullChange);
    this.version = fullChange.version;

    this.send({
      type: 'change',
      data: fullChange,
    });
  }

  /**
   * Request sync
   */
  requestSync(): void {
    this.send({
      type: 'sync',
      data: { version: this.version },
    });
  }

  /**
   * Get all presences
   */
  getPresences(): Presence[] {
    return Array.from(this.presences.values());
  }

  /**
   * Get active users
   */
  getActiveUsers(): User[] {
    return Array.from(this.presences.values())
      .filter(p => p.status === 'active')
      .map(p => p.user);
  }

  /**
   * Get changes
   */
  getChanges(): Change[] {
    return [...this.changes];
  }

  /**
   * Get current version
   */
  getVersion(): number {
    return this.version;
  }

  /**
   * Send message to server
   */
  private send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: 'heartbeat', timestamp: Date.now() });
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Attempt reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      this.emit('error', new Error('Failed to reconnect'));
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      if (this.projectId && this.currentUser) {
        this.connect(this.projectId, this.currentUser).catch(error => {
          console.error('Reconnect failed:', error);
        });
      }
    }, delay);
  }

  /**
   * Subscribe to events
   */
  on(event: string, listener: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  /**
   * Emit event
   */
  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get connection status
   */
  getStatus(): {
    connected: boolean;
    projectId: string | null;
    user: User | null;
    activeUsers: number;
    version: number;
  } {
    return {
      connected: this.ws?.readyState === WebSocket.OPEN,
      projectId: this.projectId,
      user: this.currentUser,
      activeUsers: this.getActiveUsers().length,
      version: this.version,
    };
  }
}

/**
 * User color palette for presence indicators
 */
export const UserColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
];

/**
 * Get random user color
 */
export function getRandomUserColor(): string {
  return UserColors[Math.floor(Math.random() * UserColors.length)];
}

/**
 * Singleton instance
 */
let collaborationManagerInstance: CollaborationManager | null = null;

/**
 * Get collaboration manager instance
 */
export function getCollaborationManager(): CollaborationManager {
  if (!collaborationManagerInstance) {
    collaborationManagerInstance = new CollaborationManager();
  }
  return collaborationManagerInstance;
}