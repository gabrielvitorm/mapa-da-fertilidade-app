import {
  Activity,
  Brain,
  Calendar,
  Droplet,
  Flame,
  Moon,
  Sparkles,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import type { PillarKey } from '@/types/assessment';

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
