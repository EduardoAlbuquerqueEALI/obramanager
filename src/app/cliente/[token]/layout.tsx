import { notFound } from 'next/navigation'
import Link from 'next/link'
import { validateTokenAndGetAccess } from '@/lib/portal-access'
import { Home, Hammer, MessageSquare, FileText } from 'lucide-react'
import { Toaster } from '@/components/ui/toaster'

export const dynamic = 'force-dynamic'

export default async function ClienteLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { token: string }
}) {
  const access = await validateTokenAndGetAccess(params.token)
  if (!access) notFound()

  const navItems = [
    { label: 'Início', href: `/cliente/${params.token}`, icon: Home },
    { label: 'Obra', href: `/cliente/${params.token}/obra`, icon: Hammer },
    { label: 'Chamados', href: `/cliente/${params.token}/chamados`, icon: MessageSquare },
    { label: 'Documentos', href: `/cliente/${params.token}/documentos`, icon: FileText },
  ]

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <header className="bg-background border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          {access.empreendimento.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={access.empreendimento.logoUrl}
              alt={access.empreendimento.name}
              className="h-10 w-10 rounded object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">
              {access.empreendimento.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">{access.empreendimento.name}</div>
            <div className="text-xs text-muted-foreground truncate">{access.orgName}</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="max-w-3xl mx-auto px-4 overflow-x-auto">
          <ul className="flex gap-1 min-w-max">
            {navItems.map(item => {
              const Icon = item.icon
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-primary/40 transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 pb-24">
        {children}
      </main>

      <footer className="text-center text-xs text-muted-foreground pb-6">
        Portal exclusivo do comprador · Obra Manager
      </footer>

      <Toaster />
    </div>
  )
}
