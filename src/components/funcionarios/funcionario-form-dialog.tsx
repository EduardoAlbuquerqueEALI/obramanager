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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { uploadFile, MIME_IMAGES } from '@/lib/upload'

const FUNCOES_PREDEFINIDAS = [
  'Pedreiro',
  'Servente',
  'Eletricista',
  'Encanador',
  'Pintor',
  'Carpinteiro',
  'Armador',
  'Gesseiro',
  'Azulejista',
  'Mestre de obras',
  'Engenheiro',
  'Técnico de segurança',
  'Operador de máquinas',
  'Almoxarife',
] as const

const OUTRO_VALUE = '__outro__'
import { funcionarioSchema, type FuncionarioFormData } from '@/lib/validations/treinamento'
import { createFuncionario, updateFuncionario } from '@/actions/funcionarios'
import { useToast } from '@/hooks/use-toast'

interface Props {
  mode: 'create' | 'edit'
  funcionario?: {
    id: string
    nome_completo: string
    cpf: string | null
    funcao: string | null
    foto_url: string | null
    ativo: boolean
  }
}

export default function FuncionarioFormDialog({ mode, funcionario }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(funcionario?.foto_url ?? null)
  const router = useRouter()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FuncionarioFormData>({
    resolver: zodResolver(funcionarioSchema),
    defaultValues: {
      nome_completo: funcionario?.nome_completo ?? '',
      cpf: funcionario?.cpf ?? '',
      funcao: funcionario?.funcao ?? '',
      foto_url: funcionario?.foto_url ?? null,
      ativo: funcionario?.ativo ?? true,
    },
  })

  const ativo = watch('ativo')

  // Função: select com opções pré-definidas + "Outro" com input livre
  const funcaoInicial = funcionario?.funcao ?? ''
  const isPredefined = FUNCOES_PREDEFINIDAS.includes(funcaoInicial as typeof FUNCOES_PREDEFINIDAS[number])
  const [funcaoSelect, setFuncaoSelect] = useState<string>(
    funcaoInicial ? (isPredefined ? funcaoInicial : OUTRO_VALUE) : '',
  )
  const [funcaoCustom, setFuncaoCustom] = useState<string>(
    funcaoInicial && !isPredefined ? funcaoInicial : '',
  )

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const result = await uploadFile(file, {
      prefix: 'funcionarios',
      allowedMimes: MIME_IMAGES,
      maxSizeMB: 3,
    })
    setUploading(false)
    if (!result.ok) {
      toast({ title: result.error || 'Erro ao fazer upload', variant: 'destructive' })
      return
    }
    setValue('foto_url', result.url!)
    setPreviewUrl(result.url!)
  }

  function onSubmit(data: FuncionarioFormData) {
    // Resolve funcao a partir do select + custom
    const funcaoFinal = funcaoSelect === OUTRO_VALUE
      ? (funcaoCustom.trim() || null)
      : (funcaoSelect || null)
    const payload = { ...data, funcao: funcaoFinal }

    startTransition(async () => {
      const result = mode === 'create'
        ? await createFuncionario(payload)
        : await updateFuncionario(funcionario!.id, payload)
      if (result.error) { toast({ title: result.error, variant: 'destructive' }); return }
      toast({ title: mode === 'create' ? 'Funcionário cadastrado' : 'Atualizado' })
      setOpen(false)
      if (mode === 'create') { reset(); setPreviewUrl(null); setFuncaoSelect(''); setFuncaoCustom('') }
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={mode === 'edit' ? 'sm' : 'default'} variant={mode === 'edit' ? 'outline' : 'default'}>
          {mode === 'create' ? <><Plus className="h-4 w-4 mr-2" />Novo Funcionário</> : <><Pencil className="h-4 w-4 mr-2" />Editar</>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Novo funcionário' : 'Editar funcionário'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Foto</Label>
            <div className="relative">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Preview" className="h-24 w-24 rounded-full object-cover border mx-auto" />
              ) : (
                <div className="h-24 w-24 mx-auto rounded-full border border-dashed flex items-center justify-center bg-muted/30">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={uploading}
              />
            </div>
            {uploading && <p className="text-xs text-muted-foreground text-center">Enviando...</p>}
          </div>

          <div className="space-y-2">
            <Label>Nome completo *</Label>
            <Input {...register('nome_completo')} />
            {errors.nome_completo && <p className="text-xs text-destructive">{errors.nome_completo.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>CPF</Label>
            <Input {...register('cpf')} placeholder="000.000.000-00" />
          </div>

          <div className="space-y-2">
            <Label>Função</Label>
            <Select
              value={funcaoSelect}
              onValueChange={v => {
                setFuncaoSelect(v)
                if (v !== OUTRO_VALUE) setFuncaoCustom('')
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a função" />
              </SelectTrigger>
              <SelectContent>
                {FUNCOES_PREDEFINIDAS.map(f => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
                <SelectItem value={OUTRO_VALUE}>Outro</SelectItem>
              </SelectContent>
            </Select>
            {funcaoSelect === OUTRO_VALUE && (
              <Input
                value={funcaoCustom}
                onChange={e => setFuncaoCustom(e.target.value)}
                placeholder="Digite a função..."
                className="mt-2"
                autoFocus
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="ativo-func" checked={ativo} onCheckedChange={v => setValue('ativo', !!v)} />
            <Label htmlFor="ativo-func" className="cursor-pointer">Ativo</Label>
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
