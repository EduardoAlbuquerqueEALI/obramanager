import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type CallerProfile = { org_id: string; role: 'admin' | 'member' } | null
type TargetProfile = { org_id: string } | null

export async function POST(req: NextRequest) {
  // Verify caller is admin
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: callerData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const callerProfile = callerData as CallerProfile
  if (!callerProfile || callerProfile.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 })

  // Cannot remove yourself
  if (userId === user.id) {
    return NextResponse.json({ error: 'Não é possível remover a si mesmo' }, { status: 400 })
  }

  // Verify target is in same org
  const { data: targetData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  const targetProfile = targetData as TargetProfile
  if (!targetProfile || targetProfile.org_id !== callerProfile.org_id) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  const admin = createAdminClient()

  // Delete auth user — cascade handles profiles, user_empreendimentos, user_areas
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
