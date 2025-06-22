import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SourceIndicator } from "@/components/ui/source-indicator";

export function SourceTrackingDemo() {
  const demoData = [
    {
      section: "Vitals",
      entries: [
        {
          data: "BP: 142/86 mmHg, HR: 98 bpm, Temp: 98.6°F",
          sourceType: "nurse_manual",
          sourceConfidence: 1.0,
          sourceNotes: "Taken during routine visit"
        },
        {
          data: "Weight: 102 kg, Height: 72 inches, BMI: 30.5",
          sourceType: "attachment_extracted",
          sourceConfidence: 0.85,
          extractedFromAttachmentId: 31,
          sourceNotes: "Extracted from H&P document"
        }
      ]
    },
    {
      section: "Allergies",
      entries: [
        {
          data: "Penicillin - Rash (Moderate)",
          sourceType: "patient_reported",
          sourceConfidence: 0.9,
          sourceNotes: "Patient verbally confirmed during intake"
        },
        {
          data: "No Known Drug Allergies (NKDA)",
          sourceType: "attachment_extracted",
          sourceConfidence: 0.75,
          extractedFromAttachmentId: 32
        }
      ]
    },
    {
      section: "Medications",
      entries: [
        {
          data: "Omeprazole 20mg daily - continuing",
          sourceType: "order_derived",
          sourceConfidence: 1.0,
          sourceNotes: "Generated from encounter order"
        },
        {
          data: "amLODIPine Besylate 2.5mg at bedtime",
          sourceType: "attachment_extracted",
          sourceConfidence: 0.8,
          extractedFromAttachmentId: 32,
          sourceNotes: "Home medication list from uploaded document"
        }
      ]
    },
    {
      section: "Social History",
      entries: [
        {
          data: "Never smoker, no alcohol use",
          sourceType: "soap_derived",
          sourceConfidence: 0.95,
          sourceNotes: "Parsed from encounter SOAP note"
        },
        {
          data: "Lives independently, retired teacher",
          sourceType: "patient_reported",
          sourceConfidence: 0.9
        }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Source Tracking System Demo</h2>
        <p className="text-gray-600">
          Every piece of patient data now shows its source and confidence level
        </p>
      </div>
      
      {demoData.map((section) => (
        <Card key={section.section}>
          <CardHeader>
            <CardTitle className="text-lg">{section.section}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {section.entries.map((entry, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-2">
                <div className="font-medium">{entry.data}</div>
                <SourceIndicator
                  sourceType={entry.sourceType}
                  sourceConfidence={entry.sourceConfidence}
                  sourceNotes={entry.sourceNotes}
                  extractedFromAttachmentId={entry.extractedFromAttachmentId}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
      
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <h3 className="font-semibold text-green-800">✅ Implementation Complete</h3>
            <p className="text-sm text-green-700">
              All chart sections now support multi-source data tracking with confidence scoring.
              Hover over any source badge to see detailed information.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}