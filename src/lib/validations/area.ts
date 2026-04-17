import { z } from 'zod'

export const areaSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(100),
  icon: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida'),
  description: z.string().max(300).optional().nullable(),
})

export type AreaFormData = z.infer<typeof areaSchema>

export const templateItemSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Título obrigatório').max(200),
  required: z.boolean(),
})

export type TemplateItem = z.infer<typeof templateItemSchema>

export const templateSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(100),
  items: z.array(templateItemSchema),
})

export type TemplateFormData = z.infer<typeof templateSchema>
