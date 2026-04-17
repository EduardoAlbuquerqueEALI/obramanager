'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Wrench,
  Users,
  ShoppingCart,
  ClipboardList,
  Calculator,
  Package,
  ClipboardCheck,
  Truck,
  UserCircle,
  Megaphone,
  MessageSquare,
  HardHat,
  ShieldCheck,
  Settings,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOutAction } from '@/actions/auth'

interface SidebarUser {
  name: string
  email: string
  role: string
}

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Empreendimentos', href: '/admin/empreendimentos', icon: Building2 },
  { label: 'Áreas de Serviço', href: '/admin/areas', icon: Wrench },
  { label: 'Usuários', href: '/admin/usuarios', icon: Users },
  { label: 'Kanban Compras', href: '/admin/kanban-compras', icon: ShoppingCart },
  { label: 'Kanban Tarefas', href: '/admin/kanban-tarefas', icon: ClipboardList },
  { label: 'Orçamentos', href: '/admin/orcamentos', icon: Calculator },
  { label: 'Fornecedores', href: '/admin/fornecedores', icon: Truck },
  { label: 'Estoque', href: '/admin/estoque', icon: Package },
  { label: 'Medições', href: '/admin/medicoes', icon: ClipboardCheck },
  { label: 'Compradores', href: '/admin/compradores', icon: UserCircle },
  { label: 'Atualizações', href: '/admin/atualizacoes', icon: Megaphone },
  { label: 'Chamados', href: '/admin/chamados', icon: MessageSquare },
  { label: 'FVS', href: '/admin/fvs', icon: ClipboardCheck },
  { label: 'Funcionários', href: '/admin/funcionarios', icon: HardHat },
  { label: 'Treinamentos', href: '/admin/treinamentos', icon: ShieldCheck },
  { label: 'Configurações', href: '/admin/configuracoes', icon: Settings },
]

export default function AdminSidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const result = await signOutAction()
    if (result?.redirectTo) router.push(result.redirectTo)
  }

  return (
    <aside className="w-60 shrink-0 flex flex-col border-r bg-card h-screen sticky top-0 overflow-y-auto">
      <div className="px-4 py-5 border-b">
        <span className="font-bold text-base">Obra Manager</span>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="border-t px-4 py-3">
        <div className="text-sm font-medium truncate">{user.name}</div>
        <div className="text-xs text-muted-foreground truncate">{user.email}</div>
        <button
          onClick={handleLogout}
          className="mt-2 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair
        </button>
      </div>
    </aside>
  )
}
