import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

interface StatusSolicitacaoProps {
  memberNome: string
  titulo: string
  novoStatus: string
  descricao: string | null
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: '#ca8a04' },
  approved: { label: 'Aprovada', color: '#16a34a' },
  rejected: { label: 'Rejeitada', color: '#dc2626' },
  purchased: { label: 'Comprada', color: '#2563eb' },
}

export default function StatusSolicitacao({
  memberNome,
  titulo,
  novoStatus,
  descricao,
}: StatusSolicitacaoProps) {
  const statusInfo = statusLabels[novoStatus] ?? { label: novoStatus, color: '#6b7280' }

  return (
    <Html>
      <Head />
      <Preview>Solicitacao {statusInfo.label} — {titulo}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Atualizacao de Solicitacao</Heading>
          <Text style={text}>
            Ola, <strong>{memberNome}</strong>!
          </Text>
          <Text style={text}>
            Sua solicitacao de compra foi atualizada:
          </Text>
          <Section style={cardSection}>
            <Text style={cardTitle}>{titulo}</Text>
            {descricao && <Text style={cardDesc}>{descricao}</Text>}
            <Section style={{ ...statusBadge, backgroundColor: statusInfo.color }}>
              <Text style={statusText}>{statusInfo.label}</Text>
            </Section>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>Obra Manager — Gestao de obras simplificada</Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#f6f9fc', fontFamily: 'sans-serif' }
const container = {
  backgroundColor: '#ffffff',
  margin: '40px auto',
  padding: '40px',
  borderRadius: '8px',
  maxWidth: '560px',
}
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1e293b', marginBottom: '16px' }
const text = { fontSize: '16px', color: '#475569', lineHeight: '1.6' }
const cardSection = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  padding: '20px',
  margin: '16px 0',
  borderRadius: '8px',
}
const cardTitle = { fontSize: '16px', fontWeight: 'bold' as const, color: '#1e293b', margin: '0 0 4px 0' }
const cardDesc = { fontSize: '14px', color: '#475569', margin: '0 0 12px 0' }
const statusBadge = {
  display: 'inline-block',
  padding: '4px 16px',
  borderRadius: '20px',
}
const statusText = { fontSize: '14px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0' }
const hr = { borderColor: '#e2e8f0', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const }
