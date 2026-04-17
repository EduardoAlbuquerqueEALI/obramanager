'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, Pencil, KeyRound, Trash2 } from 'lucide-react'
import EditPermissionsDialog from '@/components/edit-permissions-dialog'
import { useToast } from '@/hooks/use-toast'
import type { MultiSelectOption } from '@/components/multi-select'

export interface UserRow {
  id: string
  full_name: string
  email: string | null
  role: 'admin' | 'member'
  empreendimentoIds: string[]
  areaIds: string[]
}

interface UsuariosTableProps {
  users: UserRow[]
  empreendimentos: MultiSelectOption[]
  areas: MultiSelectOption[]
  currentUserId: string
}

export default function UsuariosTable({
  users,
  empreendimentos,
  areas,
  currentUserId,
}: UsuariosTableProps) {
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  async function handleResetPassword(userId: string) {
    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    const json = await res.json()
    if (!res.ok) {
      toast({ title: 'Erro', description: json.error, variant: 'destructive' })
    } else {
      toast({ title: 'Email de redefinição enviado' })
    }
  }

  async function handleRemoveUser(userId: string, name: string) {
    const confirmed = window.confirm(`Remover ${name}? Esta ação não pode ser desfeita.`)
    if (!confirmed) return

    const res = await fetch('/api/admin/remove-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    const json = await res.json()
    if (!res.ok) {
      toast({ title: 'Erro', description: json.error, variant: 'destructive' })
    } else {
      toast({ title: 'Usuário removido' })
      router.refresh()
    }
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            )}
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.full_name}</TableCell>
                <TableCell className="text-muted-foreground">{user.email ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {user.role === 'admin' ? 'Admin' : 'Membro'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Ações</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditUser(user)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar permissões
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleResetPassword(user.id)}
                        disabled={!user.email}
                      >
                        <KeyRound className="mr-2 h-4 w-4" />
                        Resetar senha
                      </DropdownMenuItem>
                      {user.id !== currentUserId && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleRemoveUser(user.id, user.full_name)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remover usuário
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editUser && (
        <EditPermissionsDialog
          open={!!editUser}
          onOpenChange={(v) => !v && setEditUser(null)}
          user={editUser}
          empreendimentos={empreendimentos}
          areas={areas}
        />
      )}
    </>
  )
}
