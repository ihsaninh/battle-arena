-- Tighten RLS for battle tables: remove permissive MVP policies

DO $$ BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='battle_rooms' AND policyname='mvp_all_select';
  IF FOUND THEN DROP POLICY mvp_all_select ON public.battle_rooms; END IF;
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='battle_rooms' AND policyname='mvp_all_insert';
  IF FOUND THEN DROP POLICY mvp_all_insert ON public.battle_rooms; END IF;
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='battle_rooms' AND policyname='mvp_all_update';
  IF FOUND THEN DROP POLICY mvp_all_update ON public.battle_rooms; END IF;
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='battle_rooms' AND policyname='mvp_all_delete';
  IF FOUND THEN DROP POLICY mvp_all_delete ON public.battle_rooms; END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='battle_room_participants' AND policyname='mvp_all_select';
  IF FOUND THEN DROP POLICY mvp_all_select ON public.battle_room_participants; END IF;
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='battle_room_participants' AND policyname='mvp_all_insert';
  IF FOUND THEN DROP POLICY mvp_all_insert ON public.battle_room_participants; END IF;
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='battle_room_participants' AND policyname='mvp_all_update';
  IF FOUND THEN DROP POLICY mvp_all_update ON public.battle_room_participants; END IF;
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='battle_room_participants' AND policyname='mvp_all_delete';
  IF FOUND THEN DROP POLICY mvp_all_delete ON public.battle_room_participants; END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='battle_room_rounds' AND policyname='mvp_all_select';
  IF FOUND THEN DROP POLICY mvp_all_select ON public.battle_room_rounds; END IF;
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='battle_room_rounds' AND policyname='mvp_all_insert';
  IF FOUND THEN DROP POLICY mvp_all_insert ON public.battle_room_rounds; END IF;
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='battle_room_rounds' AND policyname='mvp_all_update';
  IF FOUND THEN DROP POLICY mvp_all_update ON public.battle_room_rounds; END IF;
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='battle_room_rounds' AND policyname='mvp_all_delete';
  IF FOUND THEN DROP POLICY mvp_all_delete ON public.battle_room_rounds; END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='battle_room_answers' AND policyname='mvp_all_select';
  IF FOUND THEN DROP POLICY mvp_all_select ON public.battle_room_answers; END IF;
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='battle_room_answers' AND policyname='mvp_all_insert';
  IF FOUND THEN DROP POLICY mvp_all_insert ON public.battle_room_answers; END IF;
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='battle_room_answers' AND policyname='mvp_all_update';
  IF FOUND THEN DROP POLICY mvp_all_update ON public.battle_room_answers; END IF;
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='battle_room_answers' AND policyname='mvp_all_delete';
  IF FOUND THEN DROP POLICY mvp_all_delete ON public.battle_room_answers; END IF;
END $$;

-- With RLS enabled and no policies, anon has no access. Server APIs use service role.

