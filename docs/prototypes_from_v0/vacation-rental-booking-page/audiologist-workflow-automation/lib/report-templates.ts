// Insurance provider templates for report generation
export const insuranceTemplates = {
  aok: {
    name: "AOK",
    requiredFields: ["anamnese", "befund", "diagnose", "indikation", "versorgungsempfehlung"],
    formatting: {
      headerRequired: true,
      footerRequired: true,
      signatureRequired: true,
    },
  },
  tk: {
    name: "Techniker Krankenkasse",
    requiredFields: ["anamnese", "befund", "diagnose", "indikation", "versorgungsempfehlung", "kostenvoranschlag"],
    formatting: {
      headerRequired: true,
      footerRequired: true,
      signatureRequired: true,
    },
  },
  barmer: {
    name: "Barmer",
    requiredFields: ["anamnese", "befund", "diagnose", "indikation", "versorgungsempfehlung"],
    formatting: {
      headerRequired: true,
      footerRequired: false,
      signatureRequired: true,
    },
  },
  dak: {
    name: "DAK-Gesundheit",
    requiredFields: ["anamnese", "befund", "diagnose", "indikation", "versorgungsempfehlung"],
    formatting: {
      headerRequired: true,
      footerRequired: true,
      signatureRequired: true,
    },
  },
}

export function getTemplateForInsurance(insuranceProvider: string) {
  const provider = insuranceProvider.toLowerCase()
  return insuranceTemplates[provider as keyof typeof insuranceTemplates] || insuranceTemplates.aok
}

export function validateReportFields(report: Record<string, string>, insuranceProvider: string) {
  const template = getTemplateForInsurance(insuranceProvider)
  const missingFields = template.requiredFields.filter((field) => !report[field] || report[field].trim() === "")
  return {
    isValid: missingFields.length === 0,
    missingFields,
  }
}
