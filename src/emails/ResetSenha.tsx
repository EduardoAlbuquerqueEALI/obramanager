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

interface ResetSenhaProps {
  fullName: string
  actionLink: string
}

export default function ResetSenha({ fullName, actionLink }: ResetSenhaProps) {
  return (
    <Html>
      <Head />
      <Preview>Redefinição de senha — Obra Manager</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Redefinição de senha</Heading>
          <Text style={text}>
            Olá, <strong>{fullName}</strong>!
          </Text>
          <Text style={text}>
            Um administrador solicitou a redefinição da sua senha no Obra Manager. Clique no botão
            abaixo para criar uma nova senha.
          </Text>
          <Section style={btnSection}>
            <Button href={actionLink} style={btn}>
              Redefinir senha
            </Button>
          </Section>
          <Text style={smallText}>
            Se você não solicitou esta ação, ignore este email. O link expira em 24 horas.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>Obra Manager &mdash; Gestão de obras simplificada</Text>
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
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#1e293b', marginBottom: '16px' }
const text = { fontSize: '16px', color: '#475569', lineHeight: '1.6' }
const smallText = { fontSize: '14px', color: '#94a3b8' }
const btnSection = { textAlign: 'center' as const, margin: '32px 0' }
const btn = {
  backgroundColor: '#1e293b',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '6px',
  fontWeight: 'bold',
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#e2e8f0', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const }
