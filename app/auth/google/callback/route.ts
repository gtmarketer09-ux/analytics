import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";
import { NextResponse } from "next/server";
import { env } from "../../../server/config/env";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    return NextResponse.json({ error: oauthError }, { status: 400 });
  }
  if (!code) {
    return NextResponse.json({ error: "Authorization code missing." }, { status: 400 });
  }

  const oauth2Client = new google.auth.OAuth2(
    env.admob.clientId,
    env.admob.clientSecret,
    env.admob.redirectUri,
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.refresh_token) {
      return NextResponse.json({
        error: "No refresh token returned. Revoke prior app access and repeat consent.",
      }, { status: 400 });
    }

    process.env.ADMOB_REFRESH_TOKEN = tokens.refresh_token;
    const envPath = path.join(process.cwd(), ".env");
    const envText = fs.readFileSync(envPath, "utf8");
    const updatedText = /^ADMOB_REFRESH_TOKEN=.*$/m.test(envText)
      ? envText.replace(/^ADMOB_REFRESH_TOKEN=.*$/m, `ADMOB_REFRESH_TOKEN=${tokens.refresh_token}`)
      : `${envText}\nADMOB_REFRESH_TOKEN=${tokens.refresh_token}\n`;
    fs.writeFileSync(envPath, updatedText);

    return NextResponse.redirect(new URL("/api/cron/admob?start=2026-11-01&end=2026-11-04", url.origin));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
