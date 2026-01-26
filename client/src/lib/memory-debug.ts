// Run these in the browser console to help debug memory issues

// Memory monitoring functions
export const memoryDebug = {
  // Start memory monitoring
  startMonitoring: (intervalMs: number = 5000) => {
    console.log('🔍 Starting memory monitoring...');
    return setInterval(() => {
      if ('memory' in performance) {
        const mem = (performance as any).memory;
        const usedMB = (mem.usedJSHeapSize / (1024 * 1024)).toFixed(2);
        const totalMB = (mem.totalJSHeapSize / (1024 * 1024)).toFixed(2);

        const usagePercent = ((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100).toFixed(1);
        const color = parseFloat(usagePercent) > 80 ? 'color: #e74c3c' :
                     parseFloat(usagePercent) > 60 ? 'color: #f39c12' : 'color: #2ecc71';

        console.log(`%c🧠 Memory: ${usedMB}MB / ${totalMB}MB (${usagePercent}%)`, color);
      }
    }, intervalMs);
  },

  // Stop memory monitoring
  stopMonitoring: (intervalId: number) => {
    clearInterval(intervalId);
    console.log('⏹️ Stopped memory monitoring');
  },

  // Force garbage collection (if available)
  gc: () => {
    if ('gc' in window) {
      (window as any).gc();
      console.log('🗑️ Forced garbage collection');
      setTimeout(() => memoryDebug.logMemory(), 100);
    } else {
      console.warn('🗑️ Garbage collection not available (run Chrome with --js-flags="--expose-gc")');
    }
  },

  // Log current memory usage
  logMemory: () => {
    if ('memory' in performance) {
      const mem = (performance as any).memory;
      const usedMB = (mem.usedJSHeapSize / (1024 * 1024)).toFixed(2);
      const totalMB = (mem.totalJSHeapSize / (1024 * 1024)).toFixed(2);
      const limitMB = (mem.jsHeapSizeLimit / (1024 * 1024)).toFixed(2);

      console.log(`📊 Memory Usage:`);
      console.log(`  Used: ${usedMB}MB`);
      console.log(`  Total: ${totalMB}MB`);
      console.log(`  Limit: ${limitMB}MB`);
    } else {
      console.warn('📊 Memory API not available');
    }
  },

  // Quick memory test - create and destroy large objects
  stressTest: (sizeMB: number = 50) => {
    console.log(`🧪 Stress testing with ${sizeMB}MB allocation...`);

    const size = sizeMB * 1024 * 1024;
    const arrays: Uint8Array[] = [];

    try {
      for (let i = 0; i < 10; i++) {
        const array = new Uint8Array(size / 10);
        arrays.push(array);
        console.log(`  Created array ${i + 1}/10 (${(array.length / (1024 * 1024)).toFixed(1)}MB)`);
      }

      console.log('✅ Stress test completed successfully');
    } catch (error) {
      console.error('❌ Stress test failed:', error);
    } finally {
      // Clean up
      arrays.length = 0;
      memoryDebug.gc();
    }
  },

  // Get a snapshot of current memory state for UI (heap + canvases + calculable metrics)
  getMemorySnapshot: (): {
    heap: { usedMB: number; totalMB: number; limitMB: number; percent: number } | null;
    canvases: { width: number; height: number; mb: number }[];
    canvasTotalMB: number;
    entries: { label: string; value: string }[];
  } => {
    const canvases = Array.from(document.querySelectorAll('canvas')).map((c) => {
      const mb = (c.width * c.height * 4) / (1024 * 1024);
      return { width: c.width, height: c.height, mb };
    });
    const canvasTotalMB = canvases.reduce((s, c) => s + c.mb, 0);
    const largestCanvasMB = canvases.length ? Math.max(...canvases.map((c) => c.mb)) : 0;

    const imgs = document.querySelectorAll('img');
    let decodedImagesMB = 0;
    imgs.forEach((img) => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        decodedImagesMB += (img.naturalWidth * img.naturalHeight * 4) / (1024 * 1024);
      }
    });

    let heap: { usedMB: number; totalMB: number; limitMB: number; percent: number } | null = null;
    if ('memory' in performance) {
      const mem = (performance as any).memory;
      heap = {
        usedMB: mem.usedJSHeapSize / (1024 * 1024),
        totalMB: mem.totalJSHeapSize / (1024 * 1024),
        limitMB: mem.jsHeapSizeLimit / (1024 * 1024),
        percent: (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100,
      };
    }

    const entries: { label: string; value: string }[] = [
      { label: 'Heap used', value: heap != null ? `${heap.usedMB.toFixed(1)} MB` : '—' },
      { label: 'Heap limit', value: heap != null ? `${heap.limitMB.toFixed(0)} MB` : '—' },
      { label: 'Heap % of limit', value: heap != null ? `${heap.percent.toFixed(1)}%` : '—' },
      { label: 'Canvas count', value: String(canvases.length) },
      { label: 'Canvas total', value: `${canvasTotalMB.toFixed(1)} MB` },
      { label: 'Largest canvas', value: canvases.length ? `${largestCanvasMB.toFixed(1)} MB` : '—' },
      { label: 'Image count', value: String(imgs.length) },
      { label: 'Decoded images (est.)', value: `${decodedImagesMB.toFixed(1)} MB` },
    ];

    return {
      heap,
      canvases,
      canvasTotalMB,
      entries,
    };
  },

  // Monitor canvas memory usage
  monitorCanvas: () => {
    const canvases = document.querySelectorAll('canvas');
    console.log(`🎨 Found ${canvases.length} canvases:`);

    canvases.forEach((canvas, index) => {
      const memoryMB = (canvas.width * canvas.height * 4) / (1024 * 1024);
      console.log(`  Canvas ${index}: ${canvas.width}x${canvas.height} = ${memoryMB.toFixed(2)}MB`);
    });

    const totalMemoryMB = Array.from(canvases).reduce((total, canvas) => {
      return total + (canvas.width * canvas.height * 4) / (1024 * 1024);
    }, 0);

    console.log(`📊 Total canvas memory: ${totalMemoryMB.toFixed(2)}MB`);
  }
};

// Make available globally
if (typeof window !== 'undefined') {
  (window as any).memoryDebug = memoryDebug;
}

// Console usage instructions
console.log(`
🔧 Memory Debug Tools Available:
• memoryDebug.logMemory() - Show current memory usage
• memoryDebug.gc() - Force garbage collection
• memoryDebug.stressTest(50) - Test with 50MB allocation
• memoryDebug.monitorCanvas() - Show canvas memory usage
• memoryDebug.startMonitoring(5000) - Monitor every 5 seconds

📋 Logger Groups Available:
• window.logger.list() - Show all groups
• window.logger.enable('memory') - Enable memory logging
• window.logger.enable('canvas') - Enable canvas logging
• window.logger.enable('bounds') - Enable bounds calculation logging
• window.logger.enable('drawing') - Enable drawing operation logging
• window.logger.enable('history') - Enable history logging
• window.logger.enable('performance') - Enable performance timing

💡 All logging groups are enabled by default for debugging!
`);