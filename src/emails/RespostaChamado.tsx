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

interface RespostaChamadoProps {
  destinatarioNome: string
  autorNome: string
  chamadoTitulo: string
  mensagem: string
  chamadoUrl: string
}

export default function RespostaChamado({
  destinatarioNome,
  autorNome,
  chamadoTitulo,
  mensagem,
  chamadoUrl,
}: RespostaChamadoProps) {
  return (
    <Html>
      <Head />
      <Preview>Nova resposta no chamado — {chamadoTitulo}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Nova Resposta no Chamado</Heading>
          <Text style={text}>
            Ola, <strong>{destinatarioNome || 'Cliente'}</strong>!
          </Text>
          <Text style={text}>
            <strong>{autorNome || 'A equipe'}</strong> respondeu ao chamado{' '}
            <strong>&ldquo;{chamadoTitulo}&rdquo;</strong>:
          </Text>
          <Section style={quoteSection}>
            <Text style={quoteText}>{mensagem}</Text>
          </Section>
          <Section style={btnSection}>
            <Button href={chamadoUrl} style={btn}>
              Ver conversa completa
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
const text = { fontSize: '16px', color: '#475569', lineHeight: '1.6' }
const quoteSection = {
  backgroundColor: '#f1f5f9',
  borderLeft: '4px solid #2563eb',
  padding: '16px',
  margin: '16px 0',
  borderRadius: '0 6px 6px 0',
}
const quoteText = { fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '0' }
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
