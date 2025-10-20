import { NextRequest, NextResponse } from "next/server";

import { BATTLE_SESSION_COOKIE } from "@/src/lib/session";
import { supabaseAdmin } from "@/src/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { display_name, fingerprint_hash } = body;

    if (!display_name) {
      return NextResponse.json(
        { error: "Display name is required" },
        { status: 400 }
      );
    }

    // Generate fingerprint if not provided
    let fingerprintHash = fingerprint_hash;
    if (!fingerprintHash) {
      fingerprintHash = `fp-${display_name
        .toLowerCase()
        .replace(/\s+/g, "-")}-${Date.now()}`;
    }

    const supabase = supabaseAdmin();

    // Check if session already exists with this fingerprint
    const { data: existingSession, error: fetchError } = await supabase
      .from("battle_sessions")
      .select("*")
      .eq("fingerprint_hash", fingerprintHash)
      .maybeSingle();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error fetching existing session:", fetchError);
      return NextResponse.json(
        { error: "Failed to check existing session" },
        { status: 500 }
      );
    }

    if (existingSession) {
      // Update display name if changed
      if (existingSession.display_name !== display_name) {
        const { error: updateError } = await supabase
          .from("battle_sessions")
          .update({
            display_name,
            last_active_at: new Date().toISOString(),
          })
          .eq("id", existingSession.id);

        if (updateError) {
          console.error("Error updating session display name:", updateError);
          return NextResponse.json(
            { error: "Failed to update session" },
            { status: 500 }
          );
        }

        existingSession.display_name = display_name;
      } else {
        // Just update last_active_at
        await supabase
          .from("battle_sessions")
          .update({ last_active_at: new Date().toISOString() })
          .eq("id", existingSession.id);
      }

      const res = NextResponse.json({
        sessionId: existingSession.id,
        ...existingSession,
      });

      res.cookies.set(BATTLE_SESSION_COOKIE, existingSession.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      return res;
    }

    // Create new session
    const sessionId = `battle-session-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}`;

    const { data: newSession, error: createError } = await supabase
      .from("battle_sessions")
      .insert({
        id: sessionId,
        display_name,
        fingerprint_hash: fingerprintHash,
        created_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating session:", createError);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    const res = NextResponse.json({
      sessionId: newSession.id,
      ...newSession,
    });

    // Set HttpOnly cookie for session binding
    res.cookies.set(BATTLE_SESSION_COOKIE, newSession.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return res;
  } catch (error) {
    console.error("Battle sessions API error:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
