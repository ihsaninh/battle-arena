import {
  BattleHeader,
  BattlePageShell,
  CreatePageClient,
} from '@/src/components';

export default function BattleCreatePage() {
  return (
    <BattlePageShell>
      <BattleHeader />
      <CreatePageClient />
    </BattlePageShell>
  );
}
