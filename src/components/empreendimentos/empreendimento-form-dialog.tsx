'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Pencil, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { empreendimentoSchema, type EmpreendimentoFormData } from '@/lib/validations/empreendimento'
import { createEmpreendimento, updateEmpreendimento } from '@/actions/empreendimentos'
import { useToast } from '@/hooks/use-toast'

type Mode = 'create' | 'edit'

interface EmpreendimentoFormDialogProps {
  mode: Mode
  empreendimento?: {
    id: string
    name: string
    address: string | null
    city: string | null
    state: string | null
    status: 'planning' | 'in_progress' | 'completed' | 'paused'
    logo_url: string | null
  }
}

export default function EmpreendimentoFormDialog({ mode, empreendimento }: EmpreendimentoFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(empreendimento?.logo_url ?? null)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EmpreendimentoFormData>({
    resolver: zodResolver(empreendimentoSchema),
    defaultValues: {
      name: empreendimento?.name ?? '',
      address: empreendimento?.address ?? '',
      city: empreendimento?.city ?? '',
      state: empreendimento?.state ?? '',
      status: empreendimento?.status ?? 'planning',
      logo_url: empreendimento?.logo_url ?? null,
    },
  })

  const status = watch('status')

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `covers/${Date.now()}.${ext}`

      const { error } = await supabase.storage.from('empreendimentos').upload(path, file, { upsert: true })
      if (error) throw error

      const { data: { publicUrl } } = supabase.storage.from('empreendimentos').getPublicUrl(path)
      setValue('logo_url', publicUrl)
      setPreviewUrl(publicUrl)
    } catch {
      toast({ title: 'Erro ao fazer upload', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  function onSubmit(data: EmpreendimentoFormData) {
    startTransition(async () => {
      const result = mode === 'create'
        ? await createEmpreendimento(data)
        : await updateEmpreendimento(empreendimento!.id, data)

      if (result.error) {
        toast({ title: result.error, variant: 'destructive' })
      } else {
        toast({ title: mode === 'create' ? 'Empreendimento criado' : 'Empreendimento atualizado' })
        setOpen(false)
        if (mode === 'create') {
          reset()
          setPreviewUrl(null)
        }
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={mode === 'edit' ? 'sm' : 'default'} variant={mode === 'edit' ? 'outline' : 'default'}>
          {mode === 'create' ? <><Plus className="h-4 w-4 mr-2" />Novo Empreendimento</> : <><Pencil className="h-4 w-4 mr-2" />Editar</>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Novo Empreendimento' : 'Editar Empreendimento'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Image upload */}
          <div className="space-y-2">
            <Label>Imagem de capa</Label>
            <div className="relative">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Preview" className="w-full h-32 object-cover rounded-md border" />
              ) : (
                <div className="w-full h-32 rounded-md border border-dashed flex items-center justify-center bg-muted/30">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={uploading}
              />
            </div>
            {uploading && <p className="text-xs text-muted-foreground">Enviando...</p>}
          </div>

          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input {...register('name')} placeholder="Nome do empreendimento" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input {...register('city')} placeholder="João Pessoa" />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Input {...register('state')} placeholder="PB" maxLength={2} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Endereço</Label>
            <Input {...register('address')} placeholder="Rua, número, bairro" />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setValue('status', v as EmpreendimentoFormData['status'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planejamento</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="paused">Pausado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending || uploading}>
              {isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
