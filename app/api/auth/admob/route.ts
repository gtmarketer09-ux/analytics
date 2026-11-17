import { NextResponse } from "next/server";
import { google } from "googleapis";
import { env } from "../../../server/config/env";

export async function GET(request: Request) {
  const oauth2Client = new google.auth.OAuth2(
    env.admob.clientId,
    env.admob.clientSecret,
    env.admob.redirectUri,
  );

  const authorizationUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/admob.readonly",
      "https://www.googleapis.com/auth/admob.report",
      "openid",
    ],
  });

  return NextResponse.redirect(authorizationUrl);
}
