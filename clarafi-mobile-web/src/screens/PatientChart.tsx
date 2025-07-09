import React from 'react'
import { useRoute, Link } from 'wouter'
import { useQuery } from '@tanstack/react-query'
import { Home, ChevronRight, AlertTriangle, Pill, TestTube, Activity } from 'lucide-react'

export default function PatientChart() {
  const [, params] = useRoute('/patient/:id')
  const patientId = params?.id

  const { data: patient, isLoading } = useQuery({
    queryKey: [`/api/patients/${patientId}`],
    queryFn: async () => {
      const response = await fetch(`/api/patients/${patientId}`)
      if (!response.ok) throw new Error('Failed to fetch patient')
      return response.json()
    },
    enabled: !!patientId
  })

  const { data: allergies = [] } = useQuery({
    queryKey: [`/api/patients/${patientId}/allergies`],
    queryFn: async () => {
      const response = await fetch(`/api/patients/${patientId}/allergies`)
      if (!response.ok) throw new Error('Failed to fetch allergies')
      return response.json()
    },
    enabled: !!patientId
  })

  const { data: problems = [] } = useQuery({
    queryKey: [`/api/patients/${patientId}/medical-problems`],
    queryFn: async () => {
      const response = await fetch(`/api/patients/${patientId}/medical-problems`)
      if (!response.ok) throw new Error('Failed to fetch problems')
      return response.json()
    },
    enabled: !!patientId
  })

  const { data: medications = [] } = useQuery({
    queryKey: [`/api/patients/${patientId}/medications`],
    queryFn: async () => {
      const response = await fetch(`/api/patients/${patientId}/medications`)
      if (!response.ok) throw new Error('Failed to fetch medications')
      return response.json()
    },
    enabled: !!patientId
  })

  const { data: vitals } = useQuery({
    queryKey: [`/api/patients/${patientId}/vitals/latest`],
    queryFn: async () => {
      const response = await fetch(`/api/patients/${patientId}/vitals/latest`)
      if (!response.ok) throw new Error('Failed to fetch vitals')
      return response.json()
    },
    enabled: !!patientId
  })

  const { data: labs = [] } = useQuery({
    queryKey: [`/api/patients/${patientId}/lab-results`],
    queryFn: async () => {
      const response = await fetch(`/api/patients/${patientId}/lab-results`)
      if (!response.ok) throw new Error('Failed to fetch labs')
      return response.json()
    },
    enabled: !!patientId
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003366]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#003366] text-white p-4 flex items-center justify-between">
        <Link href="/">
          <Home className="w-6 h-6" />
        </Link>
        <h1 className="text-xl font-semibold">Patient Chart</h1>
        <div className="w-6" />
      </div>

      {/* Patient Info */}
      <div className="bg-white p-4 border-b">
        <h2 className="text-xl font-semibold">{patient?.firstName} {patient?.lastName}</h2>
        <p className="text-sm text-gray-600">MRN: {patient?.mrn}</p>
        <p className="text-sm text-gray-600">
          DOB: {patient?.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : ''}
        </p>
      </div>

      {/* Chart Sections */}
      <div className="p-4 space-y-4">
        {/* Allergies */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center mb-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
            <h3 className="text-lg font-semibold">Allergies</h3>
          </div>
          {allergies.length > 0 ? (
            <ul className="space-y-1">
              {allergies.map((allergy: any) => (
                <li key={allergy.id} className="text-sm">
                  {allergy.allergen} - {allergy.reaction}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No known allergies</p>
          )}
        </div>

        {/* Medical Problems */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-lg font-semibold mb-3">Medical Problems</h3>
          {problems.length > 0 ? (
            <ul className="space-y-1">
              {problems.map((problem: any) => (
                <li key={problem.id} className="text-sm">
                  {problem.problemName} ({problem.status})
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No active problems</p>
          )}
        </div>

        {/* Medications */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center mb-3">
            <Pill className="w-5 h-5 text-blue-500 mr-2" />
            <h3 className="text-lg font-semibold">Medications</h3>
          </div>
          {medications.length > 0 ? (
            <ul className="space-y-1">
              {medications.map((med: any) => (
                <li key={med.id} className="text-sm">
                  {med.medicationName} {med.dosage}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No current medications</p>
          )}
        </div>

        {/* Vitals */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center mb-3">
            <Activity className="w-5 h-5 text-green-500 mr-2" />
            <h3 className="text-lg font-semibold">Latest Vitals</h3>
          </div>
          {vitals ? (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>BP: {vitals.bloodPressureSystolic}/{vitals.bloodPressureDiastolic}</div>
              <div>HR: {vitals.heartRate}</div>
              <div>Temp: {vitals.temperature}°F</div>
              <div>SpO2: {vitals.oxygenSaturation}%</div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No vitals recorded</p>
          )}
        </div>

        {/* Lab Results */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center mb-3">
            <TestTube className="w-5 h-5 text-purple-500 mr-2" />
            <h3 className="text-lg font-semibold">Recent Labs</h3>
          </div>
          {labs.length > 0 ? (
            <ul className="space-y-1">
              {labs.slice(0, 5).map((lab: any) => (
                <li key={lab.id} className="text-sm">
                  {lab.testName}: {lab.result} {lab.unit}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No lab results</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4">
        <Link href={`/patient/${patientId}/orders`}>
          <button className="w-full py-3 bg-[#FFD700] text-[#003366] font-semibold rounded-lg flex items-center justify-center">
            Add Orders
            <ChevronRight className="w-5 h-5 ml-2" />
          </button>
        </Link>
      </div>
    </div>
  )
}