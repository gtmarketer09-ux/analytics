import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

const SESSION_SECRET = process.env.SESSION_SECRET || 'gt-analytics-secure-session-key-2024-xK9mP';

function signSession(username: string): string {
  const payload = `${username}:${Date.now()}`;
  const sig = createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body as { username: string; password: string };

    const envUser = (process.env.DASHBOARD_USER || process.env.USER || '').trim();
    const envPass = (process.env.DASHBOARD_PASSWORD || process.env.PASSWORD || '').trim();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    if (username.trim() !== envUser || password.trim() !== envPass) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const sessionValue = signSession(username.trim());

    const response = NextResponse.json({ success: true });
    response.cookies.set('auth_session', sessionValue, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 hours
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

