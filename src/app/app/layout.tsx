import UserNav from '@/components/user-nav'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  const profile = profileData as { full_name: string; email: string | null } | null

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-6 h-14 flex items-center justify-between">
        <span className="font-semibold text-sm">Obra Manager</span>
        <UserNav
          name={profile?.full_name ?? user.email ?? 'Usuário'}
          email={profile?.email ?? user.email ?? ''}
        />
      </header>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
