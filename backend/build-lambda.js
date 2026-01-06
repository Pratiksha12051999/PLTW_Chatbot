import esbuild from 'esbuild';
import { mkdir } from 'fs/promises';

async function bundle() {
  await mkdir('lambda-bundle', { recursive: true });

  const handlers = [
    // WebSocket handlers
    { entry: 'src/handlers/websocket/connect.ts', output: 'lambda-bundle/connect.js' },
    { entry: 'src/handlers/websocket/disconnect.ts', output: 'lambda-bundle/disconnect.js' },
    { entry: 'src/handlers/websocket/sendMessage.ts', output: 'lambda-bundle/sendMessage.js' },

    // REST API handlers
    { entry: 'src/handlers/rest/admin.ts', output: 'lambda-bundle/admin.js' },
    { entry: 'src/handlers/rest/feedback.ts', output: 'lambda-bundle/feedback.js' },
    { entry: 'src/handlers/rest/upload.ts', output: 'lambda-bundle/upload.js' }
  ];

  for (const handler of handlers) {
    console.log(`Bundling ${handler.entry}...`);

    await esbuild.build({
      entryPoints: [handler.entry],
      bundle: true,
      platform: 'node',
      target: 'node20',
      outfile: handler.output,
      format: 'cjs',
      external: ['@aws-sdk/*'],
      sourcemap: true,
      minify: false
    });

    console.log(`✅ Created ${handler.output}`);
  }

  console.log('\n🎉 All handlers bundled successfully!');
}

bundle().catch(err => {
  console.error('❌ Bundle failed:', err);
  process.exit(1);
});