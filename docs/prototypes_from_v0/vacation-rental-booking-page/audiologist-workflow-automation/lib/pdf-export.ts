// PDF export utilities
// In production, this would use a library like jsPDF or react-pdf

export interface ReportData {
  patientName: string
  patientDateOfBirth: string
  insuranceProvider: string
  insuranceNumber: string
  reportType: string
  date: string
  content: string
}

export async function generateReportPDF(report: ReportData): Promise<Blob> {
  // This is a placeholder - in production you would use a proper PDF library
  console.log("[v0] Generating PDF for report:", report)

  // Simulate PDF generation
  const pdfContent = `
    VERSICHERUNGSBERICHT
    
    Patient: ${report.patientName}
    Geburtsdatum: ${report.patientDateOfBirth}
    Versicherung: ${report.insuranceProvider}
    Versicherungsnummer: ${report.insuranceNumber}
    
    Berichtstyp: ${report.reportType}
    Datum: ${report.date}
    
    ${report.content}
  `

  return new Blob([pdfContent], { type: "application/pdf" })
}

export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function exportReportAsPDF(report: ReportData) {
  const pdfBlob = await generateReportPDF(report)
  const filename = `Bericht_${report.patientName.replace(/\s+/g, "_")}_${report.date}.pdf`
  downloadPDF(pdfBlob, filename)
}
