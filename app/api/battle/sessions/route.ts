import { NextRequest, NextResponse } from 'next/server';

import { BATTLE_SESSION_COOKIE } from '@/src/lib/database/session';
import { supabaseAdmin } from '@/src/lib/database/supabase';
import { apiLogger } from '@/src/lib/utils/logger';

const MAX_DISPLAY_NAME_LENGTH = 100;

const generateDefaultDisplayName = () =>
  `Player ${Math.floor(1000 + Math.random() * 9000)}`;

export async function POST(request: NextRequest) {
  try {
    let body: any;

    try {
      body = await request.json();
    } catch (error) {
      apiLogger.warn('Invalid JSON payload for battle session', error);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const rawDisplayName =
      typeof body?.display_name === 'string' ? body.display_name.trim() : '';
    const displayName = rawDisplayName || generateDefaultDisplayName();

    if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
      return NextResponse.json(
        {
          error: `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or less`,
        },
        { status: 400 }
      );
    }

    const normalizedDisplayName = displayName;

    let fingerprintHash =
      typeof body?.fingerprint_hash === 'string' ? body.fingerprint_hash : null;
    if (!fingerprintHash) {
      fingerprintHash = `fp-${normalizedDisplayName
        .toLowerCase()
        .replace(/\s+/g, '-')}-${Date.now()}`;
    }

    const supabase = supabaseAdmin();

    const { data: existingSession, error: fetchError } = await supabase
      .from('battle_sessions')
      .select('*')
      .eq('fingerprint_hash', fingerprintHash)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      apiLogger.error('Error fetching existing session:', fetchError);
      return NextResponse.json(
        { error: 'Failed to check existing session' },
        { status: 500 }
      );
    }

    if (existingSession) {
      if (existingSession.display_name !== normalizedDisplayName) {
        const { error: updateError } = await supabase
          .from('battle_sessions')
          .update({
            display_name: normalizedDisplayName,
            last_active_at: new Date().toISOString(),
          })
          .eq('id', existingSession.id);

        if (updateError) {
          apiLogger.error('Error updating session display name:', updateError);
          return NextResponse.json(
            { error: 'Failed to update session' },
            { status: 500 }
          );
        }

        existingSession.display_name = normalizedDisplayName;
      } else {
        await supabase
          .from('battle_sessions')
          .update({ last_active_at: new Date().toISOString() })
          .eq('id', existingSession.id);
      }

      const res = NextResponse.json({
        sessionId: existingSession.id,
        ...existingSession,
      });

      res.cookies.set(BATTLE_SESSION_COOKIE, existingSession.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });

      return res;
    }

    const sessionId = `battle-session-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}`;

    const { data: newSession, error: createError } = await supabase
      .from('battle_sessions')
      .insert({
        id: sessionId,
        display_name: normalizedDisplayName,
        fingerprint_hash: fingerprintHash,
        created_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      apiLogger.error('Error creating session:', createError);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    const res = NextResponse.json({
      sessionId: newSession.id,
      ...newSession,
    });

    res.cookies.set(BATTLE_SESSION_COOKIE, newSession.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch (error) {
    apiLogger.error('Battle sessions API error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
