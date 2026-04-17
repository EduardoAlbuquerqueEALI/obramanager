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

interface NovoChamadoProps {
  compradorNome: string
  categoria: string
  titulo: string
  descricao: string
  unidadeNumber: string
  empreendimentoNome: string
  chamadoUrl: string
}

const categoriaLabels: Record<string, string> = {
  hidraulica: 'Hidraulica',
  eletrica: 'Eletrica',
  infiltracao: 'Infiltracao',
  acabamento: 'Acabamento',
  estrutural: 'Estrutural',
  outros: 'Outros',
}

export default function NovoChamado({
  compradorNome,
  categoria,
  titulo,
  descricao,
  unidadeNumber,
  empreendimentoNome,
  chamadoUrl,
}: NovoChamadoProps) {
  return (
    <Html>
      <Head />
      <Preview>Novo chamado de assistencia — {titulo}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Novo Chamado de Assistencia</Heading>
          <Text style={text}>
            <strong>{compradorNome || 'Cliente'}</strong> abriu um chamado no portal.
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
            <tr>
              <td style={tdLabel}>Categoria</td>
              <td style={tdValue}>{categoriaLabels[categoria] ?? categoria}</td>
            </tr>
            <tr>
              <td style={tdLabel}>Titulo</td>
              <td style={tdValue}>{titulo}</td>
            </tr>
            <tr>
              <td style={tdLabel}>Descricao</td>
              <td style={tdValue}>{descricao}</td>
            </tr>
          </table>
          <Section style={btnSection}>
            <Button href={chamadoUrl} style={btn}>
              Ver chamado
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
