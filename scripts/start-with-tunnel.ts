import { spawn, type ChildProcess } from 'node:child_process';
import ngrok from '@ngrok/ngrok';

const PORT = Number(process.env.PORT || 3000);
const authtoken = process.env.NGROK_AUTH_TOKEN?.trim();

if (!authtoken) {
  console.error('\n❌ ERROR: NGROK_AUTH_TOKEN is missing in your .env file.\n');
  process.exit(1);
}

async function isServerRunning(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:${port}/api/auth/login`, {
      method: 'GET',
    });
    return res.status === 200 || res.status === 405 || res.status === 404;
  } catch {
    return false;
  }
}

async function waitForServer(port: number, maxSeconds = 30): Promise<boolean> {
  for (let i = 0; i < maxSeconds; i++) {
    if (await isServerRunning(port)) return true;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

async function main() {
  let child: ChildProcess | null = null;
  const running = await isServerRunning(PORT);

  if (!running) {
    console.log(`\n⏳ Next.js server not detected on port ${PORT}. Starting Next.js...`);
    child = spawn('npm', ['run', 'dev'], {
      stdio: 'inherit',
      shell: true,
      env: process.env,
    });

    console.log(`Waiting for server to become ready on port ${PORT}...`);
    const ready = await waitForServer(PORT, 30);
    if (!ready) {
      console.error(`❌ Server did not start within 30 seconds.`);
      if (child) child.kill();
      process.exit(1);
    }
  } else {
    console.log(`\n✅ Next.js server is already running on port ${PORT}.`);
  }

  console.log(`⏳ Connecting ngrok tunnel for port ${PORT}...`);
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
  console.log('Press Ctrl+C to stop.\n');

  // Keep event loop alive
  const keepAlive = setInterval(() => {}, 1000 * 60 * 60);

  const cleanup = async () => {
    clearInterval(keepAlive);
    console.log('\nStopping ngrok tunnel...');
    await listener.close();
    if (child) {
      console.log('Stopping Next.js server...');
      child.kill();
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
