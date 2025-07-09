import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { Search, Plus, User, Calendar, Phone } from 'lucide-react'

interface Patient {
  id: number
  firstName: string
  lastName: string
  dateOfBirth: string
  mrn: string
  phone: string
}

interface PatientListScreenProps {
  user: any
}

const PatientListScreen: React.FC<PatientListScreenProps> = ({ user }) => {
  const [patients, setPatients] = useState<Patient[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPatients()
  }, [])

  const fetchPatients = async () => {
    try {
      const response = await axios.get('/api/patients', { withCredentials: true })
      setPatients(response.data)
    } catch (error) {
      console.error('Error fetching patients:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPatients = patients.filter(patient => {
    const searchLower = searchTerm.toLowerCase()
    return (
      patient.firstName.toLowerCase().includes(searchLower) ||
      patient.lastName.toLowerCase().includes(searchLower) ||
      patient.mrn.toLowerCase().includes(searchLower)
    )
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-navy-blue text-white p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Patients</h1>
          <span className="text-sm">Welcome, {user?.username}</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 bg-white shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search patients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-blue focus:border-transparent"
          />
        </div>
      </div>

      {/* Patient List */}
      <div className="p-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="text-gray-500">Loading patients...</div>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500">
              {searchTerm ? 'No patients found' : 'No patients yet'}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPatients.map((patient) => (
              <Link
                key={patient.id}
                to={`/patient/${patient.id}`}
                className="block bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center">
                  <div className="bg-gray-100 rounded-full p-3 mr-4">
                    <User className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {patient.firstName} {patient.lastName}
                    </h3>
                    <div className="text-sm text-gray-600 mt-1">
                      <div className="flex items-center gap-4">
                        <span>MRN: {patient.mrn}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(patient.dateOfBirth)}
                        </span>
                        {patient.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {patient.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <Link
        to="/voice-recording/new"
        className="fixed bottom-6 right-6 bg-gold hover:bg-yellow-600 text-navy-blue font-bold rounded-full p-4 shadow-lg"
      >
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  )
}

export default PatientListScreen