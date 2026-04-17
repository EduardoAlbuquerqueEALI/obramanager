import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

const OBRA_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://obra.dynamus.cc'
const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = 'Espelho Dynamus <noreply@mail.dynamus.cc>'

async function sendBuyerPortalEmail(opts: {
  nome: string
  email: string
  token: string
  empreendimento: string
  unidade: string
}) {
  if (!RESEND_API_KEY) return
  const portalUrl = `${OBRA_APP_URL}/cliente/${opts.token}`
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [opts.email],
      subject: `Acompanhe o andamento da sua obra — ${opts.empreendimento}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#fff;">
          <h1 style="font-size:20px;color:#1e293b;margin-bottom:8px;">Olá, ${opts.nome}!</h1>
          <p style="color:#64748b;font-size:15px;line-height:1.6;margin-bottom:24px;">
            Seu imóvel no <strong>${opts.empreendimento} — Unidade ${opts.unidade}</strong> está em construção.
            Acesse o portal do comprador para acompanhar o progresso, ver fotos e abrir chamados de assistência técnica.
          </p>
          <a href="${portalUrl}"
             style="display:inline-block;background:#1e293b;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
            Acompanhar obra
          </a>
          <p style="margin-top:32px;color:#94a3b8;font-size:12px;border-top:1px solid #f1f5f9;padding-top:16px;">
            Este link é pessoal e intransferível. Guarde-o com segurança.
          </p>
        </div>
      `,
    }),
  }).catch((err) => console.error('[obra-webhook] email error:', err))
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return NextResponse.json({ error: 'Token obrigatório' }, { status: 401 })

  const admin = createAdminClient()

  // Find organization by webhook secret
  const { data: org } = await admin
    .from('organizations')
    .select('id, name')
    .eq('spelho_webhook_secret', token)
    .single()

  if (!org) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  let body: { event: string; data: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { event, data } = body

  // ─── contract.signed ──────────────────────────────────────────────────────
  if (event === 'contract.signed') {
    const d = data as {
      spelho_dev_id: string
      spelho_unit_id?: string
      unit_number: string
      block_name?: string
      floor?: number
      buyer_name?: string
      buyer_email?: string
      buyer_phone?: string
    }

    // 1. Find or create empreendimento
    let empId: string

    const { data: empMapping } = await admin
      .from('external_mappings')
      .select('internal_id')
      .eq('system', 'spelho')
      .eq('entity_type', 'empreendimento')
      .eq('external_id', d.spelho_dev_id)
      .single()

    if (empMapping) {
      empId = empMapping.internal_id
    } else {
      return NextResponse.json(
        { error: 'Empreendimento não mapeado. Sincronize o empreendimento primeiro via SPELHO.' },
        { status: 422 }
      )
    }

    // 2. Find or create torre based on block_name
    const blockName = d.block_name || 'Principal'
    let torreId: string

    const { data: existingTorre } = await admin
      .from('torres')
      .select('id')
      .eq('empreendimento_id', empId)
      .eq('name', blockName)
      .single()

    if (existingTorre) {
      torreId = existingTorre.id
    } else {
      const { data: newTorre, error: torreErr } = await admin
        .from('torres')
        .insert({ empreendimento_id: empId, name: blockName, floors: 1 })
        .select('id')
        .single()
      if (torreErr || !newTorre) {
        console.error('[obra-webhook] erro ao criar torre:', torreErr)
        return NextResponse.json({ error: 'Erro ao criar torre' }, { status: 500 })
      }
      torreId = newTorre.id
    }

    // 3. Find or create unidade
    let unidadeId: string
    const externalUnitId = d.spelho_unit_id || `${d.spelho_dev_id}:${d.unit_number}`

    const { data: unitMapping } = await admin
      .from('external_mappings')
      .select('internal_id')
      .eq('system', 'spelho')
      .eq('entity_type', 'unidade')
      .eq('external_id', externalUnitId)
      .single()

    if (unitMapping) {
      unidadeId = unitMapping.internal_id
    } else {
      // Check if unidade already exists by number in this torre
      const { data: existingUnit } = await admin
        .from('unidades')
        .select('id')
        .eq('torre_id', torreId)
        .eq('number', d.unit_number)
        .single()

      if (existingUnit) {
        unidadeId = existingUnit.id
      } else {
        const { data: newUnit, error: unitErr } = await admin
          .from('unidades')
          .insert({
            torre_id: torreId,
            number: d.unit_number,
            floor: d.floor ?? 1,
            status: 'sold',
            owner_name: d.buyer_name ?? null,
          })
          .select('id')
          .single()
        if (unitErr || !newUnit) {
          console.error('[obra-webhook] erro ao criar unidade:', unitErr)
          return NextResponse.json({ error: 'Erro ao criar unidade' }, { status: 500 })
        }
        unidadeId = newUnit.id
      }

      // Save mapping
      await admin.from('external_mappings').upsert({
        org_id: org.id,
        entity_type: 'unidade',
        internal_id: unidadeId,
        system: 'spelho',
        external_id: externalUnitId,
        metadata: { unit_number: d.unit_number, block_name: blockName },
      }, { onConflict: 'system,entity_type,external_id' })
    }

    // 4. Create or update acesso_cliente
    const { data: existingAcesso } = await admin
      .from('acessos_cliente')
      .select('id, token')
      .eq('unidade_id', unidadeId)
      .single()

    let accessToken: string
    let isNew = false

    if (existingAcesso) {
      accessToken = existingAcesso.token
      // Update buyer info if provided
      if (d.buyer_name || d.buyer_email) {
        await admin.from('acessos_cliente').update({
          comprador_nome: d.buyer_name ?? undefined,
          comprador_email: d.buyer_email ?? undefined,
          comprador_telefone: d.buyer_phone ?? undefined,
        }).eq('id', existingAcesso.id)
      }
    } else {
      accessToken = crypto.randomBytes(32).toString('hex')
      const { error: acessoErr } = await admin.from('acessos_cliente').insert({
        unidade_id: unidadeId,
        empreendimento_id: empId,
        token: accessToken,
        comprador_nome: d.buyer_name ?? null,
        comprador_email: d.buyer_email ?? null,
        comprador_telefone: d.buyer_phone ?? null,
      })
      if (acessoErr) {
        console.error('[obra-webhook] erro ao criar acesso_cliente:', acessoErr)
        return NextResponse.json({ error: 'Erro ao criar acesso do comprador' }, { status: 500 })
      }
      isNew = true
    }

    // 5. Send email to buyer if new access and email provided
    if (isNew && d.buyer_email && d.buyer_name) {
      const { data: emp } = await admin
        .from('empreendimentos')
        .select('name')
        .eq('id', empId)
        .single()

      await sendBuyerPortalEmail({
        nome: d.buyer_name,
        email: d.buyer_email,
        token: accessToken,
        empreendimento: emp?.name ?? org.name,
        unidade: d.unit_number,
      })
    }

    return NextResponse.json({
      ok: true,
      unidade_id: unidadeId,
      access_token: accessToken,
      is_new_access: isNew,
    })
  }

  // ─── development.created ──────────────────────────────────────────────────
  if (event === 'development.created') {
    const d = data as {
      spelho_dev_id: string
      name: string
      address?: string
      city?: string
      state?: string
    }

    // Idempotent
    const { data: existing } = await admin
      .from('external_mappings')
      .select('internal_id')
      .eq('system', 'spelho')
      .eq('entity_type', 'empreendimento')
      .eq('external_id', d.spelho_dev_id)
      .single()

    if (existing) {
      return NextResponse.json({ ok: true, skipped: true, empreendimento_id: existing.internal_id })
    }

    const { data: emp, error: empErr } = await admin
      .from('empreendimentos')
      .insert({
        org_id: org.id,
        name: d.name,
        address: d.address ?? null,
        city: d.city ?? null,
        state: d.state ?? null,
        status: 'planning',
      })
      .select('id')
      .single()

    if (empErr || !emp) {
      console.error('[obra-webhook] erro ao criar empreendimento:', empErr)
      return NextResponse.json({ error: 'Erro ao criar empreendimento' }, { status: 500 })
    }

    await admin.from('external_mappings').insert({
      org_id: org.id,
      entity_type: 'empreendimento',
      internal_id: emp.id,
      system: 'spelho',
      external_id: d.spelho_dev_id,
      metadata: { name: d.name },
    })

    return NextResponse.json({ ok: true, empreendimento_id: emp.id })
  }

  // ─── buyer.created (sent by FLUXO after contract is created) ────────────
  // Updates acesso_cliente with buyer info if the unit already exists
  if (event === 'buyer.created') {
    const d = data as {
      spelho_dev_id: string
      unit_number: string
      buyer_name?: string
      buyer_email?: string
      buyer_phone?: string
    }

    // Find empreendimento via mapping
    const { data: empMapping } = await admin
      .from('external_mappings')
      .select('internal_id')
      .eq('org_id', org.id)
      .eq('system', 'spelho')
      .eq('entity_type', 'empreendimento')
      .eq('external_id', d.spelho_dev_id)
      .single()

    if (!empMapping) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'empreendimento não mapeado' })
    }

    // Find unidade by number + empreendimento
    const { data: torre } = await admin
      .from('torres')
      .select('id')
      .eq('empreendimento_id', empMapping.internal_id)
      .limit(1)
      .single()

    if (!torre) return NextResponse.json({ ok: true, skipped: true, reason: 'torre não encontrada' })

    const { data: unidade } = await admin
      .from('unidades')
      .select('id')
      .eq('torre_id', torre.id)
      .eq('number', d.unit_number)
      .single()

    if (!unidade) return NextResponse.json({ ok: true, skipped: true, reason: 'unidade não encontrada' })

    // Update acesso_cliente buyer info
    await admin
      .from('acessos_cliente')
      .update({
        comprador_nome: d.buyer_name ?? undefined,
        comprador_email: d.buyer_email ?? undefined,
        comprador_telefone: d.buyer_phone ?? undefined,
      })
      .eq('unidade_id', unidade.id)

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Evento desconhecido' }, { status: 400 })
}
