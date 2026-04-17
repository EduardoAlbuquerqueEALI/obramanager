/**
 * Helpers de upload seguro — client-side.
 * Valida tipo/tamanho, gera path único com UUID, e retorna URL pública.
 */
import { createClient } from '@/lib/supabase/client'

export const MIME_IMAGES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
export const MIME_IMAGES_OR_PDF = [...MIME_IMAGES, 'application/pdf']

const DEFAULT_MAX_MB = 5

export interface UploadOptions {
  bucket?: string
  prefix: string             // ex: 'funcionarios' | 'certificados'
  allowedMimes?: string[]    // default MIME_IMAGES
  maxSizeMB?: number         // default 5
  upsert?: boolean           // default false (nunca sobrescrever)
}

export interface UploadResult {
  ok: boolean
  url?: string
  error?: string
}

function extFromMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
    case 'image/jpg': return 'jpg'
    case 'image/png': return 'png'
    case 'image/webp': return 'webp'
    case 'application/pdf': return 'pdf'
    default: return 'bin'
  }
}

export async function uploadFile(file: File, options: UploadOptions): Promise<UploadResult> {
  const {
    bucket = 'empreendimentos',
    prefix,
    allowedMimes = MIME_IMAGES,
    maxSizeMB = DEFAULT_MAX_MB,
    upsert = false,
  } = options

  // Validação client-side (repetida server-side via Supabase + bucket policies)
  if (!allowedMimes.includes(file.type)) {
    return {
      ok: false,
      error: `Tipo não permitido. Aceitos: ${allowedMimes.map(m => m.split('/')[1]).join(', ')}`,
    }
  }

  const maxBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxBytes) {
    return { ok: false, error: `Arquivo maior que ${maxSizeMB}MB` }
  }

  const supabase = createClient()
  // Path: prefix/uuid.ext — uuid garante unicidade, extensão derivada do mime real
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const ext = extFromMime(file.type)
  const path = `${prefix}/${id}.${ext}`

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert,
    contentType: file.type,
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
  return { ok: true, url: publicUrl }
}
