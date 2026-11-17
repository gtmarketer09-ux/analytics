import ngrok from '@ngrok/ngrok';

const PORT = Number(process.env.PORT || 3000);
const authtoken = process.env.NGROK_AUTH_TOKEN?.trim();

if (!authtoken) {
  console.error('\n❌ ERROR: NGROK_AUTH_TOKEN is missing in your .env file.\n');
  process.exit(1);
}

async function startTunnel() {
  try {
    console.log('\n⏳ Starting ngrok tunnel for port', PORT, '...');

    const listener = await ngrok.forward({
      addr: PORT,
      authtoken,
    });

    const url = listener.url();

    console.log('\n' + '='.repeat(60));
    console.log('🚀 GT Analytics Public Access is LIVE!');
    console.log('='.repeat(60));
    console.log(`\n  🌐 Public URL:   ${url}`);
    console.log(`  🏠 Local URL:    http://localhost:${PORT}`);
    console.log(`\n  🔑 Login Credentials:`);
    console.log(`     Username:     CEO`);
    console.log(`     Password:     #*@=$`);
    console.log('\n' + '='.repeat(60));
    console.log('Press Ctrl+C to stop the tunnel.\n');

    // Keep event loop alive
    const keepAlive = setInterval(() => {}, 1000 * 60 * 60);

    const cleanup = async () => {
      clearInterval(keepAlive);
      console.log('\nShutting down ngrok tunnel...');
      await listener.close();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  } catch (err: unknown) {
    console.error('❌ Failed to establish ngrok tunnel:', err);
    process.exit(1);
  }
}

startTunnel();
