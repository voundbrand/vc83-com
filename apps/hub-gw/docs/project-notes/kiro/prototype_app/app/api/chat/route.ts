import { streamText, tool, convertToModelMessages, stepCountIs } from 'ai'
import { z } from 'zod'

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = streamText({
    model: 'openai/gpt-4o-mini',
    system: `Du bist der Gründungswerft Assistent, ein hilfreicher KI-Assistent für die Gründungswerft Benefits-Plattform.
    
Du hilfst Mitgliedern bei:
- Erstellen, Bearbeiten und Verwalten von Benefits, Provisionen und Leistungen
- Fragen zur Plattform und deren Funktionen
- Empfehlungen für passende Benefits und Dienstleistungen

Antworte immer auf Deutsch und sei freundlich und professionell.
Wenn ein Benutzer ein neues Angebot erstellen möchte, sammle alle nötigen Informationen und verwende dann das entsprechende Tool.`,
    messages: await convertToModelMessages(messages),
    tools: {
      createBenefit: tool({
        description: 'Erstellt einen neuen Benefit auf der Plattform',
        inputSchema: z.object({
          title: z.string().describe('Der Titel des Benefits'),
          description: z.string().describe('Eine ausführliche Beschreibung'),
          category: z.enum(['Marketing', 'Beratung', 'Software', 'Design', 'Buchhaltung', 'Recht']).describe('Die Kategorie'),
          discount: z.string().nullable().describe('Der Rabatt, z.B. "20%" oder "50€"'),
        }),
        execute: async ({ title, description, category, discount }) => {
          return {
            success: true,
            message: `Benefit "${title}" wurde erfolgreich erstellt!`,
            data: { title, description, category, discount }
          }
        },
      }),
      createProvision: tool({
        description: 'Erstellt eine neue Provision auf der Plattform',
        inputSchema: z.object({
          title: z.string().describe('Der Titel der Provision'),
          description: z.string().describe('Eine ausführliche Beschreibung'),
          category: z.enum(['IT & Entwicklung', 'Immobilien', 'Marketing', 'Beratung', 'Vertrieb', 'Personal']).describe('Die Kategorie'),
          commission: z.string().describe('Die Provisionshöhe, z.B. "10%" oder "500€"'),
        }),
        execute: async ({ title, description, category, commission }) => {
          return {
            success: true,
            message: `Provision "${title}" wurde erfolgreich erstellt!`,
            data: { title, description, category, commission }
          }
        },
      }),
      createLeistung: tool({
        description: 'Erstellt eine neue Leistung/Service auf der Plattform',
        inputSchema: z.object({
          title: z.string().describe('Der Titel der Leistung'),
          description: z.string().describe('Eine ausführliche Beschreibung'),
          category: z.enum(['Webentwicklung', 'Design', 'Marketing', 'Beratung', 'Buchhaltung', 'Recht', 'IT-Support', 'Fotografie', 'Texterstellung']).describe('Die Kategorie'),
          skills: z.array(z.string()).describe('Skills und Technologien'),
          hourlyRate: z.string().nullable().describe('Der Stundensatz, z.B. "85€"'),
          location: z.string().describe('Der Standort'),
        }),
        execute: async ({ title, description, category, skills, hourlyRate, location }) => {
          return {
            success: true,
            message: `Leistung "${title}" wurde erfolgreich erstellt!`,
            data: { title, description, category, skills, hourlyRate, location }
          }
        },
      }),
      listMyOffers: tool({
        description: 'Zeigt alle eigenen Angebote des Benutzers an',
        inputSchema: z.object({
          type: z.enum(['all', 'benefits', 'provisionen', 'leistungen']).describe('Welche Art von Angeboten angezeigt werden soll'),
        }),
        execute: async ({ type }) => {
          // In a real app, this would fetch from the database
          return {
            success: true,
            message: `Hier sind Ihre ${type === 'all' ? 'Angebote' : type}. Besuchen Sie /meine-angebote für eine vollständige Übersicht.`,
            redirectUrl: '/meine-angebote'
          }
        },
      }),
      navigateTo: tool({
        description: 'Navigiert den Benutzer zu einer bestimmten Seite',
        inputSchema: z.object({
          page: z.enum(['benefits', 'provisionen', 'leistungen', 'meine-angebote', 'profile', 'my-requests']).describe('Die Zielseite'),
        }),
        execute: async ({ page }) => {
          const urls: Record<string, string> = {
            'benefits': '/benefits',
            'provisionen': '/provisionen',
            'leistungen': '/leistungen',
            'meine-angebote': '/meine-angebote',
            'profile': '/profile',
            'my-requests': '/my-requests',
          }
          return {
            success: true,
            message: `Navigiere zu ${page}...`,
            redirectUrl: urls[page]
          }
        },
      }),
    },
    stopWhen: stepCountIs(5),
  })

  return result.toUIMessageStreamResponse()
}
