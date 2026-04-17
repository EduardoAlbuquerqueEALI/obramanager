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

interface AtualizacaoObraProps {
  compradorNome: string
  empreendimentoNome: string
  titulo: string
  descricao: string | null
  percentualAvanco: number | null
  portalUrl: string
}

export default function AtualizacaoObra({
  compradorNome,
  empreendimentoNome,
  titulo,
  descricao,
  percentualAvanco,
  portalUrl,
}: AtualizacaoObraProps) {
  return (
    <Html>
      <Head />
      <Preview>Atualizacao da obra — {titulo}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Atualizacao da Obra</Heading>
          <Text style={text}>
            Ola, <strong>{compradorNome || 'Cliente'}</strong>!
          </Text>
          <Text style={text}>
            Ha uma nova atualizacao sobre o empreendimento{' '}
            <strong>{empreendimentoNome}</strong>.
          </Text>
          <Section style={cardSection}>
            <Heading as="h2" style={h2}>{titulo}</Heading>
            {descricao && <Text style={cardText}>{descricao}</Text>}
            {percentualAvanco != null && (
              <Text style={progressText}>
                Avanco da obra: <strong>{percentualAvanco}%</strong>
              </Text>
            )}
          </Section>
          <Section style={btnSection}>
            <Button href={portalUrl} style={btn}>
              Ver no portal
            </Button>
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
const h2 = { fontSize: '18px', fontWeight: 'bold' as const, color: '#1e293b', margin: '0 0 8px 0' }
const text = { fontSize: '16px', color: '#475569', lineHeight: '1.6' }
const cardSection = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  padding: '20px',
  margin: '16px 0',
  borderRadius: '8px',
}
const cardText = { fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: '0 0 8px 0' }
const progressText = { fontSize: '16px', color: '#2563eb', margin: '8px 0 0 0' }
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
