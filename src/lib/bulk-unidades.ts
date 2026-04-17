import type { BulkUnidadeFormData } from './validations/empreendimento'

export type GeneratedUnidade = {
  floor: number
  number: string
  type: string | null
}

/**
 * Pure function to generate unidade rows from the bulk form data.
 * Shared between the server action (for insert) and the dialog (for reactive preview).
 *
 * Convention: `floors` = número de andares residenciais.
 * Se `include_ground` estiver marcado, gera TAMBÉM o andar 0 (total = floors + 1 andares).
 * Caso contrário, gera apenas andares 1..floors.
 */
export function generateUnidadeRows(data: BulkUnidadeFormData): GeneratedUnidade[] {
  const out: GeneratedUnidade[] = []

  const residentialFloors: number[] = []
  if (data.include_ground) residentialFloors.push(0)
  for (let f = 1; f <= data.floors; f++) residentialFloors.push(f)

  for (const f of residentialFloors) {
    const override = data.overrides.find(o => o.floor === f)
    const count = override?.units_count ?? data.units_per_floor
    const type =
      (override?.type !== undefined && override?.type !== null && override.type !== '')
        ? override.type
        : (data.default_type && data.default_type !== '' ? data.default_type : null)

    for (let pos = 1; pos <= count; pos++) {
      let number: string
      if (data.numbering.scheme === 'mcmv') {
        // 001, 002 para térreo; 101, 102 para andar 1; etc.
        number = String(f * 100 + pos).padStart(3, '0')
      } else {
        // Prefixo fixo + identificador do andar ('T' para térreo) + posição.
        // Ex: A11, A12, A21, AT1 (para prefix='A')
        const floorToken = f === 0 ? 'T' : String(f)
        number = `${data.numbering.prefix}${floorToken}${pos}`
      }
      out.push({ floor: f, number, type })
    }
  }

  return out
}
