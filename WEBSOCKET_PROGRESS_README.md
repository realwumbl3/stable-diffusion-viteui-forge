# WebSocket Progress Updates

This implementation adds real-time progress updates via WebSocket instead of polling, providing more efficient and responsive progress tracking for generation tasks.

## Overview

The WebSocket system broadcasts progress updates as they happen during image generation, including:
- Real-time progress percentage
- Live preview images
- ETA calculations
- Task status updates
- Error notifications

## WebSocket Endpoint

**URL:** `ws://localhost:7861/internal/progress-ws`

**Optional Query Parameter:** `task_id` - Subscribe to a specific task's progress

## Message Format

### Connection Confirmation
```json
{
  "type": "connected",
  "task_id": null
}
```

### Progress Update
```json
{
  "task_id": "task(txt2img-ABC123)",
  "active": true,
  "queued": false,
  "completed": false,
  "progress": 0.45,
  "eta": 12.5,
  "live_preview": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "id_live_preview": 5,
  "textinfo": "Sampling step 18/40",
  "sampling_step": 18,
  "sampling_steps": 40,
  "job_no": 1,
  "job_count": 1
}
```

### Task Completion
```json
{
  "task_id": "task(txt2img-ABC123)",
  "active": false,
  "queued": false,
  "completed": true,
  "progress": 1.0,
  "textinfo": "Task completed successfully"
}
```

### Task Failure
```json
{
  "task_id": "task(txt2img-ABC123)",
  "active": false,
  "queued": false,
  "completed": true,
  "progress": 0,
  "textinfo": "Task failed: CUDA out of memory"
}
```

## Client Implementation

See `websocket_client_example.js` for a complete JavaScript client implementation.

### Basic Usage

```javascript
const ws = new WebSocket('ws://localhost:7861/internal/progress-ws');

ws.onopen = () => {
    console.log('Connected to progress WebSocket');
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.progress !== undefined) {
        updateProgress(data.progress);
    }

    if (data.live_preview) {
        updatePreview(data.live_preview);
    }

    if (data.textinfo) {
        updateStatus(data.textinfo);
    }
};
```

### Task-Specific Subscription

```javascript
// Subscribe to a specific task's progress
const taskId = 'task(txt2img-ABC123)';
const ws = new WebSocket(`ws://localhost:7861/internal/progress-ws?task_id=${taskId}`);
```

## Implementation Details

### Broadcasting Triggers

Progress updates are broadcast when:
1. A new preview image is generated during sampling
2. A task starts execution
3. A task completes successfully
4. A task fails with an error

### Connection Management

- The server maintains a set of active WebSocket connections
- Dead connections are automatically cleaned up
- Multiple clients can connect simultaneously
- Each client receives all progress updates (can be filtered client-side)

### Error Handling

- WebSocket broadcasting errors don't interrupt generation
- Failed connections are automatically removed
- Clients can reconnect automatically with exponential backoff

### Performance

- Progress updates are sent asynchronously to avoid blocking generation
- Preview images are compressed and base64-encoded for efficient transmission
- Connection pooling minimizes overhead

## Backwards Compatibility

The existing REST API endpoints (`/internal/progress` and `/sdapi/v1/progress`) continue to work as before, so existing clients that use polling will continue to function.

## Testing

Use the provided `test_websocket.py` script to test the WebSocket functionality:

```bash
python test_websocket.py
```

This will test both the WebSocket connection and the REST API endpoints.