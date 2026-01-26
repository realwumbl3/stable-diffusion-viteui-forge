// Test the logger formatting in development

export const testLogger = () => {
  const { logger } = require('./logger');

  console.log('🧪 Testing Logger Formatting (All Groups Enabled by Default)...\n');

  // Test all groups with different log levels
  const groups = ['memory', 'canvas', 'drawing', 'performance', 'history', 'bounds'];

  groups.forEach(group => {
    logger.info(group, `Test info message from ${group}`);
    logger.warn(group, `Test warning from ${group}`);
  });

  // Test with data
  logger.info('memory', 'Test with data:', { test: 'value', number: 42, array: [1, 2, 3] });

  // Test performance timing
  logger.time('performance', 'Test Timer');
  setTimeout(() => {
    logger.timeEnd('performance', 'Test Timer');
    console.log('\n✅ Logger tests complete - check above for all colored logs!');
  }, 100);
};

// Make available globally in development
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).testLogger = testLogger;
}