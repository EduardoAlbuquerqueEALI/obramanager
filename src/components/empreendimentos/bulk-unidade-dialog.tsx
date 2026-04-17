'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useWatch, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Layers, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  bulkUnidadeSchema,
  type BulkUnidadeFormData,
  type BulkUnidadeFormInput,
  type FloorOverride,
} from '@/lib/validations/empreendimento'
import { generateUnidadeRows } from '@/lib/bulk-unidades'
import { createUnidadesBulk } from '@/actions/empreendimentos'
import { useToast } from '@/hooks/use-toast'

interface BulkUnidadeDialogProps {
  torreId: string
  torreName: string
  empreendimentoId: string
}

const defaultValues: BulkUnidadeFormInput = {
  floors: 15,
  include_ground: false,
  units_per_floor: 4,
  default_type: '',
  default_status: 'pendente',
  numbering: { scheme: 'mcmv' },
  overrides: [],
}

export default function BulkUnidadeDialog({
  torreId,
  torreName,
  empreendimentoId,
}: BulkUnidadeDialogProps) {
  const [open, setOpen] = useState(false)
  const [showOverrides, setShowOverrides] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<BulkUnidadeFormInput, unknown, BulkUnidadeFormData>({
    resolver: zodResolver(bulkUnidadeSchema),
    defaultValues,
  })

  // Reactive values for preview
  const watched = useWatch({ control }) as Partial<BulkUnidadeFormInput>

  const preview = useMemo(() => {
    // Guard: only compute once basic required fields are valid numbers
    if (
      typeof watched.floors !== 'number' ||
      typeof watched.units_per_floor !== 'number' ||
      !watched.numbering
    ) {
      return [] as ReturnType<typeof generateUnidadeRows>
    }
    const scheme = watched.numbering.scheme
    if (scheme === 'prefix' && (!watched.numbering.prefix || watched.numbering.prefix.length === 0)) {
      return []
    }
    try {
      return generateUnidadeRows({
        floors: watched.floors,
        include_ground: !!watched.include_ground,
        units_per_floor: watched.units_per_floor,
        default_type: watched.default_type ?? null,
        default_status: watched.default_status ?? 'pendente',
        numbering: watched.numbering as BulkUnidadeFormData['numbering'],
        overrides: (watched.overrides ?? []) as FloorOverride[],
      })
    } catch {
      return []
    }
  }, [watched])

  // Residential floors list for overrides UI (derived from preview inputs)
  const residentialFloors = useMemo<number[]>(() => {
    const floors = typeof watched.floors === 'number' ? watched.floors : 0
    const arr: number[] = []
    if (watched.include_ground) arr.push(0)
    for (let f = 1; f <= floors; f++) arr.push(f)
    return arr
  }, [watched.floors, watched.include_ground])

  function getOverride(floor: number): FloorOverride | undefined {
    return (watched.overrides ?? []).find(o => o.floor === floor)
  }

  function upsertOverride(floor: number, patch: Partial<Omit<FloorOverride, 'floor'>>) {
    const current = (watched.overrides ?? []) as FloorOverride[]
    const existing = current.find(o => o.floor === floor)
    const defaultCount = typeof watched.units_per_floor === 'number' ? watched.units_per_floor : 1
    const defaultType = watched.default_type ?? null
    const merged: FloorOverride = {
      floor,
      units_count: existing?.units_count ?? defaultCount,
      type: existing?.type ?? defaultType ?? null,
      ...patch,
    }
    const without = current.filter(o => o.floor !== floor)
    setValue('overrides', [...without, merged], { shouldDirty: true })
  }

  function removeOverride(floor: number) {
    const current = (watched.overrides ?? []) as FloorOverride[]
    setValue('overrides', current.filter(o => o.floor !== floor), { shouldDirty: true })
  }

  function onSubmit(data: BulkUnidadeFormData) {
    startTransition(async () => {
      const result = await createUnidadesBulk(torreId, empreendimentoId, data)
      if (result.error) {
        toast({ title: result.error, variant: 'destructive' })
        if (result.skipped && result.skipped.length > 0) {
          toast({
            title: `${result.skipped.length} conflito(s): ${result.skipped.slice(0, 5).join(', ')}${result.skipped.length > 5 ? '...' : ''}`,
          })
        }
        return
      }
      toast({ title: `${result.created} unidade(s) criada(s)` })
      if (result.skipped && result.skipped.length > 0) {
        toast({
          title: `${result.skipped.length} puladas (já existem): ${result.skipped.slice(0, 5).join(', ')}${result.skipped.length > 5 ? '...' : ''}`,
        })
      }
      setOpen(false)
      setShowOverrides(false)
      reset(defaultValues)
      router.refresh()
    })
  }

  const scheme = watched.numbering?.scheme ?? 'mcmv'

  const previewSample = preview.slice(0, 8).map(r => r.number).join(', ')
  const previewMore = preview.length > 8 ? `, ... (+${preview.length - 8})` : ''

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) {
          setShowOverrides(false)
          reset(defaultValues)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 text-xs">
          <Layers className="h-3 w-3 mr-1" /> Gerar em massa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerar unidades em massa — {torreName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Quantidade de andares *</Label>
              <Input
                {...register('floors', { valueAsNumber: true })}
                type="number"
                min={1}
                max={99}
              />
              {errors.floors && (
                <p className="text-xs text-destructive">{errors.floors.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Unidades por andar *</Label>
              <Input
                {...register('units_per_floor', { valueAsNumber: true })}
                type="number"
                min={1}
                max={99}
              />
              {errors.units_per_floor && (
                <p className="text-xs text-destructive">{errors.units_per_floor.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Controller
              control={control}
              name="include_ground"
              render={({ field }) => (
                <Checkbox
                  id="include-ground"
                  checked={!!field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
              )}
            />
            <Label htmlFor="include-ground" className="cursor-pointer">
              Incluir térreo (andar 0)
            </Label>
          </div>

          <div className="space-y-2">
            <Label>Tipologia padrão</Label>
            <Input
              {...register('default_type')}
              placeholder="Ex: 2Q, 3Q, Cobertura..."
            />
          </div>

          <div className="space-y-2">
            <Label>Status inicial</Label>
            <Controller
              control={control}
              name="default_status"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => field.onChange(v as BulkUnidadeFormData['default_status'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="entregue">Entregue</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Numeração</Label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  value="mcmv"
                  checked={scheme === 'mcmv'}
                  onChange={() => setValue('numbering', { scheme: 'mcmv' }, { shouldDirty: true })}
                />
                <span>Padrão MCMV: 101, 102, ..., 201</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  value="prefix"
                  checked={scheme === 'prefix'}
                  onChange={() =>
                    setValue('numbering', { scheme: 'prefix', prefix: 'A' }, { shouldDirty: true })
                  }
                />
                <span>Prefixo customizado:</span>
                <Input
                  disabled={scheme !== 'prefix'}
                  value={
                    watched.numbering && watched.numbering.scheme === 'prefix'
                      ? watched.numbering.prefix ?? ''
                      : ''
                  }
                  onChange={(e) =>
                    setValue(
                      'numbering',
                      { scheme: 'prefix', prefix: e.target.value.slice(0, 5) },
                      { shouldDirty: true },
                    )
                  }
                  placeholder="A"
                  className="h-7 w-20 text-sm"
                  maxLength={5}
                />
              </label>
            </div>
          </div>

          {/* Overrides collapsible */}
          <div className="border rounded-md">
            <button
              type="button"
              onClick={() => setShowOverrides(s => !s)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
            >
              {showOverrides ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span className="flex-1 text-left">Customizar andares (opcional)</span>
              {(watched.overrides ?? []).length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {(watched.overrides ?? []).length} override(s)
                </span>
              )}
            </button>
            {showOverrides && (
              <div className="border-t px-3 py-2 space-y-2 max-h-64 overflow-y-auto">
                {residentialFloors.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    Configure os andares primeiro.
                  </p>
                ) : (
                  residentialFloors.map(f => {
                    const ov = getOverride(f)
                    const currentCount =
                      ov?.units_count ??
                      (typeof watched.units_per_floor === 'number' ? watched.units_per_floor : 1)
                    const currentType =
                      ov?.type ?? (watched.default_type ?? '')
                    return (
                      <div
                        key={f}
                        className="grid grid-cols-[3rem_5rem_1fr_auto] gap-2 items-center text-sm"
                      >
                        <span className="font-mono text-xs text-muted-foreground">
                          {f === 0 ? 'Térreo' : `${f}°`}
                        </span>
                        <Input
                          type="number"
                          min={1}
                          max={99}
                          value={currentCount}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10)
                            if (!isNaN(v)) upsertOverride(f, { units_count: v })
                          }}
                          className="h-7 text-xs"
                        />
                        <Input
                          value={currentType ?? ''}
                          placeholder="tipologia"
                          onChange={(e) => upsertOverride(f, { type: e.target.value || null })}
                          className="h-7 text-xs"
                        />
                        {ov ? (
                          <button
                            type="button"
                            onClick={() => removeOverride(f)}
                            className="text-xs text-muted-foreground hover:text-destructive"
                          >
                            limpar
                          </button>
                        ) : (
                          <span className="w-10" />
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="rounded-md bg-muted/30 px-3 py-2 text-xs space-y-1">
            <p className="font-medium">
              Preview: {preview.length} unidade{preview.length !== 1 ? 's' : ''} ser
              {preview.length === 1 ? 'á' : 'ão'} criada{preview.length === 1 ? '' : 's'}
            </p>
            {preview.length > 0 && (
              <p className="font-mono text-muted-foreground break-all">
                {previewSample}
                {previewMore}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || preview.length === 0}>
              {isPending
                ? 'Gerando...'
                : `Gerar ${preview.length} unidade${preview.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
