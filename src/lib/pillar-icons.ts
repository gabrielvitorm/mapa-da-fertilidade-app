import {
  Activity,
  Brain,
  Calendar,
  Droplet,
  Flame,
  FlaskConical,
  Hourglass,
  Leaf,
  Moon,
  Shield,
  Sparkles,
  Users,
  Utensils,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import type { PillarKey } from '@/types/assessment';
import type { ChecklistPillarKey } from '@/types/checklist';

export const PILLAR_ICON: Record<PillarKey, LucideIcon> = {
  fatores_infertilidade: Sparkles,
  saude_hormonal: Flame,
  ciclo: Calendar,
  sono: Moon,
  imunidade: Activity,
  atividade_fisica: Activity,
  alimentacao: Utensils,
  saude_intestinal: Droplet,
  figado: Flame,
  estresse: Brain,
  tireoide: Sparkles,
  toxinas: Droplet,
  historico: Calendar,
};

/** Ícones dos 13 pilares do Checklist v2 (docs/08). */
export const CHECKLIST_PILLAR_ICON: Record<ChecklistPillarKey, LucideIcon> = {
  idade_tentativa: Hourglass,
  ciclo_ovulacao: Calendar,
  somp: Flame,
  endometriose_pelve: Activity,
  trompas: Waves,
  reserva_ovariana: Sparkles,
  tireoide: Shield,
  disruptores: Leaf,
  figado: Droplet,
  intestino: Utensils,
  metabolismo_nutricao: Activity,
  metilacao_inflamacao: FlaskConical,
  fator_masculino: Users,
};

/** Ícone de um pilar de qualquer versão do quiz (as chaves que coincidem usam o do Checklist). */
export function pillarIcon(pillar: string): LucideIcon {
  return (
    (CHECKLIST_PILLAR_ICON as Record<string, LucideIcon>)[pillar] ??
    (PILLAR_ICON as Record<string, LucideIcon>)[pillar] ??
    Sparkles
  );
}
