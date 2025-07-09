import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { ChevronLeft, Plus, AlertCircle, Pill, Activity, FileText } from 'lucide-react'

interface Patient {
  id: number
  firstName: string
  lastName: string
  dateOfBirth: string
  mrn: string
  allergies?: any[]
  medications?: any[]
  medicalProblems?: any[]
  vitals?: any
}

const PatientChartScreen: React.FC = () => {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPatientData()
  }, [patientId])

  const fetchPatientData = async () => {
    try {
      const [patientRes, allergiesRes, vitalsRes] = await Promise.all([
        axios.get(`/api/patients/${patientId}`, { withCredentials: true }),
        axios.get(`/api/patients/${patientId}/allergies`, { withCredentials: true }),
        axios.get(`/api/patients/${patientId}/vitals/latest`, { withCredentials: true })
      ])

      setPatient({
        ...patientRes.data,
        allergies: allergiesRes.data,
        vitals: vitalsRes.data
      })
    } catch (error) {
      console.error('Error fetching patient data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading patient chart...</div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Patient not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-navy-blue text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => navigate('/patients')} className="mr-3">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-xl font-bold">
                {patient.firstName} {patient.lastName}
              </h1>
              <p className="text-sm opacity-75">MRN: {patient.mrn}</p>
            </div>
          </div>
          <Link
            to={`/voice-recording/${patientId}`}
            className="bg-gold hover:bg-yellow-600 text-navy-blue font-bold rounded-full p-2"
          >
            <Plus className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Chart Sections */}
      <div className="p-4 space-y-4">
        {/* Allergies */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center mb-3">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <h2 className="font-semibold text-gray-900">Allergies</h2>
          </div>
          {patient.allergies && patient.allergies.length > 0 ? (
            <ul className="space-y-2">
              {patient.allergies.map((allergy: any, index: number) => (
                <li key={index} className="text-gray-700">
                  {allergy.allergen} - {allergy.reaction}
                  {allergy.severity && (
                    <span className="ml-2 text-sm text-gray-500">
                      ({allergy.severity})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No known allergies</p>
          )}
        </div>

        {/* Medical Problems */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center mb-3">
            <FileText className="w-5 h-5 text-blue-500 mr-2" />
            <h2 className="font-semibold text-gray-900">Medical Problems</h2>
          </div>
          {patient.medicalProblems && patient.medicalProblems.length > 0 ? (
            <ul className="space-y-2">
              {patient.medicalProblems.map((problem: any, index: number) => (
                <li key={index} className="text-gray-700">
                  {problem.name}
                  {problem.status && (
                    <span className="ml-2 text-sm text-gray-500">
                      ({problem.status})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No active problems</p>
          )}
        </div>

        {/* Medications */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center mb-3">
            <Pill className="w-5 h-5 text-green-500 mr-2" />
            <h2 className="font-semibold text-gray-900">Medications</h2>
          </div>
          {patient.medications && patient.medications.length > 0 ? (
            <ul className="space-y-2">
              {patient.medications.map((med: any, index: number) => (
                <li key={index} className="text-gray-700">
                  {med.name} {med.dosage} - {med.frequency}
                  {med.route && (
                    <span className="ml-2 text-sm text-gray-500">
                      ({med.route})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No active medications</p>
          )}
        </div>

        {/* Vitals */}
        {patient.vitals && (
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center mb-3">
              <Activity className="w-5 h-5 text-purple-500 mr-2" />
              <h2 className="font-semibold text-gray-900">Latest Vitals</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {patient.vitals.bloodPressure && (
                <div>
                  <p className="text-sm text-gray-500">Blood Pressure</p>
                  <p className="font-medium">{patient.vitals.bloodPressure}</p>
                </div>
              )}
              {patient.vitals.heartRate && (
                <div>
                  <p className="text-sm text-gray-500">Heart Rate</p>
                  <p className="font-medium">{patient.vitals.heartRate} bpm</p>
                </div>
              )}
              {patient.vitals.temperature && (
                <div>
                  <p className="text-sm text-gray-500">Temperature</p>
                  <p className="font-medium">{patient.vitals.temperature}°F</p>
                </div>
              )}
              {patient.vitals.oxygenSaturation && (
                <div>
                  <p className="text-sm text-gray-500">O2 Saturation</p>
                  <p className="font-medium">{patient.vitals.oxygenSaturation}%</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PatientChartScreen