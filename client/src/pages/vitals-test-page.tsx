import { VitalsParserTest } from "@/components/vitals/vitals-parser-test";

export function VitalsTestPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Vitals Parser Testing</h1>
          <p className="text-gray-600 mt-2">
            Test the GPT-powered vitals parsing system that converts freeform text to structured vitals data.
          </p>
        </div>
        
        <VitalsParserTest />
      </div>
    </div>
  );
}