import {
  Body,
  Button,
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

interface AcessoClienteProps {
  compradorNome: string
  empreendimentoNome: string
  unidadeNumber: string
  portalUrl: string
}

export default function AcessoCliente({
  compradorNome,
  empreendimentoNome,
  unidadeNumber,
  portalUrl,
}: AcessoClienteProps) {
  return (
    <Html>
      <Head />
      <Preview>Seu acesso ao portal — {empreendimentoNome}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Bem-vindo ao Portal do Cliente</Heading>
          <Text style={text}>
            Ola, <strong>{compradorNome || 'Cliente'}</strong>!
          </Text>
          <Text style={text}>
            Seu acesso ao portal de acompanhamento de obra foi criado. Atraves dele voce pode
            acompanhar o progresso da obra, abrir chamados de assistencia e consultar documentos.
          </Text>
          <table style={tableStyle}>
            <tr>
              <td style={tdLabel}>Empreendimento</td>
              <td style={tdValue}>{empreendimentoNome}</td>
            </tr>
            <tr>
              <td style={tdLabel}>Unidade</td>
              <td style={tdValue}>{unidadeNumber}</td>
            </tr>
          </table>
          <Section style={btnSection}>
            <Button href={portalUrl} style={btn}>
              Acessar o portal
            </Button>
          </Section>
          <Text style={smallText}>
            Guarde este email. O link acima e seu acesso exclusivo ao portal de acompanhamento.
          </Text>
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
const smallText = { fontSize: '14px', color: '#94a3b8' }
const tableStyle = { width: '100%', borderCollapse: 'collapse' as const, margin: '16px 0' }
const tdLabel = { padding: '8px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', fontWeight: 600, fontSize: '14px', color: '#374151' }
const tdValue = { padding: '8px', border: '1px solid #e5e7eb', fontSize: '14px', color: '#475569' }
const btnSection = { textAlign: 'center' as const, margin: '32px 0' }
const btn = {
  backgroundColor: '#1e293b',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '6px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#e2e8f0', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const }
