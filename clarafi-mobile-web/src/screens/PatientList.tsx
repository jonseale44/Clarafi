import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Plus, ChevronRight, Menu, Mic } from 'lucide-react'
import { Link } from 'wouter'

export default function PatientList() {
  const [searchQuery, setSearchQuery] = useState('')
  
  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['/api/patients'],
    queryFn: async () => {
      const response = await fetch('/api/patients')
      if (!response.ok) throw new Error('Failed to fetch patients')
      return response.json()
    }
  })

  const filteredPatients = patients.filter((patient: any) =>
    patient.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.mrn.includes(searchQuery)
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#003366] text-white p-4 flex items-center justify-between">
        <Menu className="w-6 h-6" />
        <h1 className="text-xl font-semibold">Patients</h1>
        <Link href="/voice">
          <Mic className="w-6 h-6" />
        </Link>
      </div>

      {/* Search Bar */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search patients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#003366]"
          />
        </div>
      </div>

      {/* Patient List */}
      <div className="px-4">
        {isLoading ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#003366]"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredPatients.map((patient: any) => (
              <Link key={patient.id} href={`/patient/${patient.id}`}>
                <div className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {patient.lastName}, {patient.firstName}
                    </h3>
                    <p className="text-sm text-gray-600">MRN: {patient.mrn}</p>
                    <p className="text-sm text-gray-600">
                      DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <Link href="/voice">
        <button className="fixed bottom-6 right-6 w-14 h-14 bg-[#003366] text-white rounded-full shadow-lg flex items-center justify-center">
          <Plus className="w-6 h-6" />
        </button>
      </Link>
    </div>
  )
}