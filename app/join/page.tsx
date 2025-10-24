import {
  BattleHeader,
  BattlePageShell,
  JoinPageClient,
} from '@/src/components';

export default function BattleJoinPage() {
  return (
    <BattlePageShell>
      <BattleHeader />
      <JoinPageClient />
    </BattlePageShell>
  );
}
