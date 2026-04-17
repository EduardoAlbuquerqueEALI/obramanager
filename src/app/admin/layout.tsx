import AdminSidebar from '@/components/admin-sidebar'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('profiles')
    .select('full_name, email, role')
    .eq('id', user.id)
    .single()
  const profile = profileData as { full_name: string; email: string | null; role: string } | null

  return (
    <div className="flex min-h-screen">
      <AdminSidebar
        user={{
          name: profile?.full_name ?? user.email ?? 'Usuário',
          email: profile?.email ?? user.email ?? '',
          role: profile?.role ?? 'member',
        }}
      />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
