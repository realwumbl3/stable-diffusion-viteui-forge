interface LogGroup {
  name: string;
  enabled: boolean;
  color: string;
}

interface LogGroups {
  [key: string]: LogGroup;
}

class Logger {
  private groups: LogGroups;
  private memoryThresholds = {
    canvasSize: 1024 * 1024 * 10, // 10MB warning threshold for canvas operations
    imageDataSize: 1024 * 1024 * 5, // 5MB warning threshold for ImageData
  };

  constructor() {
    // Initialize log groups with default states - all enabled for debugging
    this.groups = {
      memory: {
        name: 'Memory',
        enabled: true, // Always enabled for memory debugging
        color: '#ff6b6b'
      },
      canvas: {
        name: 'Canvas',
        enabled: true,
        color: '#4ecdc4'
      },
      drawing: {
        name: 'Drawing',
        enabled: true,
        color: '#45b7d1'
      },
      performance: {
        name: 'Performance',
        enabled: true,
        color: '#f9ca24'
      },
      history: {
        name: 'History',
        enabled: true,
        color: '#6c5ce7'
      },
      bounds: {
        name: 'Bounds',
        enabled: true,
        color: '#fd79a8'
      }
    };

    // Load settings from localStorage
    this.loadSettings();

    // Ensure all groups are enabled for this app
    this.enableAllGroups(true);

    // Log startup confirmation
    console.log('%c🚀 ViteUI Logger: All logging groups enabled for debugging', 'color: #2ecc71; font-weight: bold;');

    // Add global logging controls to window for easy access
    if (typeof window !== 'undefined') {
      (window as any).logger = {
        enable: (group: string) => this.enableGroup(group),
        disable: (group: string) => this.disableGroup(group),
        toggle: (group: string) => this.toggleGroup(group),
        enableAll: () => this.enableAllGroups(),
        disableAll: () => this.disableAllGroups(),
        list: () => this.listGroups(),
        clear: () => console.clear(),
        reset: () => this.resetSettings()
      };
    }
  }

  private loadSettings(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const settings = localStorage.getItem('viteui-logger-settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        Object.keys(parsed).forEach(group => {
          if (this.groups[group]) {
            this.groups[group].enabled = parsed[group];
          }
        });
      }
      // Always ensure memory logging is enabled for debugging
      this.groups.memory.enabled = true;
    } catch (e) {
      console.warn('Failed to load logger settings:', e);
      // On error, ensure all groups are enabled
      this.enableAllGroups();
    }
  }

  private saveSettings(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const settings: { [key: string]: boolean } = {};
      Object.keys(this.groups).forEach(group => {
        settings[group] = this.groups[group].enabled;
      });
      localStorage.setItem('viteui-logger-settings', JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save logger settings:', e);
    }
  }

  private formatMessage(group: string, level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    const groupInfo = this.groups[group];

    if (data !== undefined) {
      // When data is provided, include both %c placeholders for styling
      return `%c[${timestamp}] ${groupInfo.name}:${level}%c ${message}`;
    } else {
      // When no data, just one %c for the group color
      return `%c[${timestamp}] ${groupInfo.name}:${level} ${message}`;
    }
  }

  private log(level: 'log' | 'warn' | 'error', group: string, message: string, data?: any): void {
    const groupInfo = this.groups[group];
    if (!groupInfo || !groupInfo.enabled) return;

    const formattedMessage = this.formatMessage(group, level.toUpperCase(), message, data);

    if (data !== undefined) {
      // Two styles: group color for prefix, normal color for message
      console[level](formattedMessage,
        `color: ${groupInfo.color}; font-weight: bold;`,
        'color: inherit; font-weight: normal;',
        data);
    } else {
      // One style: group color for the entire message
      console[level](formattedMessage, `color: ${groupInfo.color}; font-weight: bold;`);
    }
  }

  // Public logging methods
  info(group: string, message: string, data?: any): void {
    this.log('log', group, message, data);
  }

  warn(group: string, message: string, data?: any): void {
    this.log('warn', group, message, data);
  }

  error(group: string, message: string, data?: any): void {
    this.log('error', group, message, data);
  }

  // Memory-specific logging with automatic size warnings
  memory(group: string, operation: string, size?: number, data?: any): void {
    if (!this.groups[group]?.enabled && group !== 'memory') return;

    let message = `Memory: ${operation}`;
    if (size !== undefined) {
      const sizeMB = (size / (1024 * 1024)).toFixed(2);
      message += ` (${sizeMB}MB)`;

      // Warn if size exceeds thresholds
      if (size > this.memoryThresholds.canvasSize && operation.includes('canvas')) {
        this.warn('memory', `Large canvas operation: ${operation} (${sizeMB}MB)`, data);
      } else if (size > this.memoryThresholds.imageDataSize && operation.includes('ImageData')) {
        this.warn('memory', `Large ImageData operation: ${operation} (${sizeMB}MB)`, data);
      }
    }

    this.info('memory', message, data);
  }

  // Performance timing
  time(group: string, label: string): void {
    if (!this.groups[group]?.enabled && group !== 'performance') return;
    console.time(`${this.groups[group].name}:${label}`);
  }

  timeEnd(group: string, label: string): void {
    if (!this.groups[group]?.enabled && group !== 'performance') return;
    console.timeEnd(`${this.groups[group].name}:${label}`);
  }

  // Group management
  enableGroup(group: string): void {
    if (this.groups[group]) {
      this.groups[group].enabled = true;
      this.saveSettings();
      console.log(`%c✓ Logger: Enabled ${group} logging`, 'color: #2ecc71');
    }
  }

  disableGroup(group: string): void {
    if (this.groups[group]) {
      this.groups[group].enabled = false;
      this.saveSettings();
      console.log(`%c✗ Logger: Disabled ${group} logging`, 'color: #e74c3c');
    }
  }

  toggleGroup(group: string): void {
    if (this.groups[group]) {
      this.groups[group].enabled = !this.groups[group].enabled;
      this.saveSettings();
      const status = this.groups[group].enabled ? 'Enabled' : 'Disabled';
      console.log(`%c${this.groups[group].enabled ? '✓' : '✗'} Logger: ${status} ${group} logging`, `color: ${this.groups[group].color}`);
    }
  }

  listGroups(): void {
    console.group('%c📋 Logger Groups', 'color: #3498db; font-weight: bold');
    Object.entries(this.groups).forEach(([key, group]) => {
      const status = group.enabled ? '✓' : '✗';
      console.log(`%c${status} ${key}: ${group.name}`, `color: ${group.color}`);
    });
    console.groupEnd();

    console.log('%c💡 Usage: window.logger.enable("group") | window.logger.disable("group") | window.logger.toggle("group") | window.logger.enableAll() | window.logger.disableAll()', 'color: #95a5a6');
  }

  enableAllGroups(silent: boolean = false): void {
    Object.keys(this.groups).forEach(group => {
      this.groups[group].enabled = true;
    });
    this.saveSettings();
    if (!silent) {
      console.log('%c✅ Logger: All groups enabled', 'color: #2ecc71');
    }
  }

  disableAllGroups(): void {
    Object.keys(this.groups).forEach(group => {
      this.groups[group].enabled = false;
    });
    this.saveSettings();
    console.log('%c❌ Logger: All groups disabled', 'color: #e74c3c');
  }

  resetSettings(): void {
    this.enableAllGroups(true);
    console.log('%c🔄 Logger: Settings reset - all groups enabled', 'color: #f39c12');
  }

  // Get current memory usage (if available)
  getMemoryUsage(): void {
    if ('memory' in performance) {
      const mem = (performance as any).memory;
      const usedMB = (mem.usedJSHeapSize / (1024 * 1024)).toFixed(2);
      const totalMB = (mem.totalJSHeapSize / (1024 * 1024)).toFixed(2);
      const limitMB = (mem.jsHeapSizeLimit / (1024 * 1024)).toFixed(2);

      this.info('memory', `Heap: ${usedMB}MB used / ${totalMB}MB total / ${limitMB}MB limit`);
    }
  }
}

// Create singleton instance
export const logger = new Logger();

// Add memory usage logging to window for manual checks
if (typeof window !== 'undefined') {
  (window as any).logMemory = () => logger.getMemoryUsage();
}

// Export types for TypeScript
export type { LogGroup, LogGroups };