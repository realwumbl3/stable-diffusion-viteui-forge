// Example WebSocket client for real-time progress updates
// This would be used in a web browser or Node.js application

class ProgressWebSocketClient {
    constructor(serverUrl = 'ws://localhost:7861') {
        this.serverUrl = serverUrl;
        this.ws = null;
        this.taskId = null;
        this.onProgressUpdate = null;
        this.onConnected = null;
        this.onDisconnected = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    connect(taskId = null) {
        this.taskId = taskId;
        const url = taskId
            ? `${this.serverUrl}/internal/progress-ws?task_id=${taskId}`
            : `${this.serverUrl}/internal/progress-ws`;

        try {
            this.ws = new WebSocket(url);

            this.ws.onopen = (event) => {
                console.log('WebSocket connected');
                this.reconnectAttempts = 0;
                if (this.onConnected) {
                    this.onConnected();
                }
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };

            this.ws.onclose = (event) => {
                console.log('WebSocket disconnected');
                if (this.onDisconnected) {
                    this.onDisconnected();
                }
                // Attempt to reconnect if not intentionally closed
                if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    setTimeout(() => {
                        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
                        this.connect(this.taskId);
                    }, 1000 * this.reconnectAttempts); // Exponential backoff
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close(1000, 'Client disconnecting');
            this.ws = null;
        }
    }

    handleMessage(data) {
        if (data.type === 'connected') {
            console.log('Connection confirmed by server');
            return;
        }

        if (data.type === 'pong') {
            // Response to our ping
            return;
        }

        // This is a progress update
        if (this.onProgressUpdate) {
            this.onProgressUpdate(data);
        }

        // Log progress for debugging
        if (data.progress !== undefined) {
            console.log(`Progress: ${(data.progress * 100).toFixed(1)}%`, {
                active: data.active,
                eta: data.eta,
                textinfo: data.textinfo,
                hasPreview: !!data.live_preview
            });
        }
    }

    // Send a ping to keep connection alive
    ping() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping' }));
        }
    }

    // Subscribe to a specific task
    subscribeToTask(taskId) {
        this.taskId = taskId;
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'subscribe',
                task_id: taskId
            }));
        }
    }
}

// Usage example:
/*
const client = new ProgressWebSocketClient();

// Set up event handlers
client.onConnected = () => {
    console.log('Connected to progress WebSocket');
};

client.onProgressUpdate = (progress) => {
    // Update UI with progress data
    updateProgressBar(progress.progress);
    updatePreviewImage(progress.live_preview);
    updateStatusText(progress.textinfo);

    if (progress.eta) {
        updateETAText(`ETA: ${Math.round(progress.eta)}s`);
    }
};

client.onDisconnected = () => {
    console.log('Disconnected from progress WebSocket');
};

// Connect to WebSocket
client.connect();

// Start a generation task and subscribe to its progress
// (You would get the task ID from the API response when starting generation)
const taskId = 'task(txt2img-ABC123)';
client.subscribeToTask(taskId);

// Send periodic pings to keep connection alive
setInterval(() => client.ping(), 30000); // Every 30 seconds
*/