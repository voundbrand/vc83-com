import { Card } from "@/components/ui/card"
import { FileText } from "lucide-react"

interface ReportPreviewProps {
  report: string
  patientName: string
  reportType: string
  date: string
}

export function ReportPreview({ report, patientName, reportType, date }: ReportPreviewProps) {
  return (
    <Card className="p-8 bg-card">
      {/* Report Header */}
      <div className="border-b border-border pb-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Versicherungsbericht</h2>
            <p className="text-sm text-muted-foreground">{reportType}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Patient</p>
            <p className="text-foreground font-medium">{patientName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Datum</p>
            <p className="text-foreground font-medium">{new Date(date).toLocaleDateString("de-DE")}</p>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="prose prose-sm max-w-none">
        <div className="whitespace-pre-wrap text-foreground leading-relaxed">{report}</div>
      </div>

      {/* Report Footer */}
      <div className="border-t border-border pt-6 mt-8">
        <div className="text-sm text-muted-foreground">
          <p>Erstellt mit HörDok - Professionelle Dokumentation für Hörakkustiker</p>
          <p className="mt-2">Dieser Bericht wurde KI-gestützt erstellt und sollte vor dem Versand überprüft werden.</p>
        </div>
      </div>
    </Card>
  )
}
