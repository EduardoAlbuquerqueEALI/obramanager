'use client'

import {
  Wrench,
  Hammer,
  HardHat,
  Paintbrush,
  Zap,
  Droplets,
  Wind,
  Flame,
  Layers,
  SquareStack,
  Grid3x3,
  Building2,
  Home,
  DoorOpen,
  AppWindow,
  ArrowUpFromLine,
  Fence,
  TreePine,
  Construction,
  CableCar,
  Cpu,
  Wifi,
  Lightbulb,
  Settings,
  Package,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const ICONS: { name: string; icon: React.ElementType; label: string }[] = [
  { name: 'wrench', icon: Wrench, label: 'Chave' },
  { name: 'hammer', icon: Hammer, label: 'Martelo' },
  { name: 'hard-hat', icon: HardHat, label: 'Capacete' },
  { name: 'paintbrush', icon: Paintbrush, label: 'Pintura' },
  { name: 'zap', icon: Zap, label: 'Elétrica' },
  { name: 'droplets', icon: Droplets, label: 'Hidráulica' },
  { name: 'wind', icon: Wind, label: 'Ar-cond.' },
  { name: 'flame', icon: Flame, label: 'Incêndio' },
  { name: 'layers', icon: Layers, label: 'Alvenaria' },
  { name: 'square-stack', icon: SquareStack, label: 'Revestimento' },
  { name: 'grid-3x3', icon: Grid3x3, label: 'Piso' },
  { name: 'building2', icon: Building2, label: 'Estrutura' },
  { name: 'home', icon: Home, label: 'Acabamento' },
  { name: 'door-open', icon: DoorOpen, label: 'Esquadrias' },
  { name: 'app-window', icon: AppWindow, label: 'Janelas' },
  { name: 'arrow-up', icon: ArrowUpFromLine, label: 'Escadas' },
  { name: 'fence', icon: Fence, label: 'Cerca' },
  { name: 'tree-pine', icon: TreePine, label: 'Paisagismo' },
  { name: 'construction', icon: Construction, label: 'Obras' },
  { name: 'cable-car', icon: CableCar, label: 'Elevador' },
  { name: 'cpu', icon: Cpu, label: 'Automação' },
  { name: 'wifi', icon: Wifi, label: 'Rede' },
  { name: 'lightbulb', icon: Lightbulb, label: 'Iluminação' },
  { name: 'settings', icon: Settings, label: 'Geral' },
  { name: 'package', icon: Package, label: 'Material' },
]

export function getIconComponent(name: string): React.ElementType {
  return ICONS.find(i => i.name === name)?.icon ?? Wrench
}

interface IconPickerProps {
  value: string
  onChange: (name: string) => void
}

export default function IconPicker({ value, onChange }: IconPickerProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {ICONS.map(({ name, icon: Icon, label }) => (
        <button
          key={name}
          type="button"
          title={label}
          onClick={() => onChange(name)}
          className={cn(
            'flex flex-col items-center gap-1 p-2 rounded-md border transition-colors text-xs',
            value === name
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-transparent hover:border-border hover:bg-muted text-muted-foreground',
          )}
        >
          <Icon className="h-5 w-5" />
          <span className="truncate w-full text-center leading-none">{label}</span>
        </button>
      ))}
    </div>
  )
}
