import React, { useState } from 'react'
import { useRoute, Link } from 'wouter'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Home, Send } from 'lucide-react'

export default function OrderEntry() {
  const [, params] = useRoute('/patient/:id/orders')
  const patientId = params?.id
  const [orderText, setOrderText] = useState('')
  const [parsedOrders, setParsedOrders] = useState<any[]>([])
  const queryClient = useQueryClient()

  const parseMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await fetch('/api/orders/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      if (!response.ok) throw new Error('Failed to parse orders')
      return response.json()
    },
    onSuccess: (data) => {
      setParsedOrders(data.orders || [])
    }
  })

  const submitMutation = useMutation({
    mutationFn: async (orders: any[]) => {
      const response = await fetch(`/api/patients/${patientId}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders })
      })
      if (!response.ok) throw new Error('Failed to submit orders')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}`] })
      alert('Orders submitted successfully!')
      setOrderText('')
      setParsedOrders([])
    }
  })

  const handleParse = () => {
    if (orderText.trim()) {
      parseMutation.mutate(orderText)
    }
  }

  const handleSubmit = () => {
    if (parsedOrders.length > 0) {
      submitMutation.mutate(parsedOrders)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-[#003366] text-white p-4 flex items-center justify-between">
        <Link href={`/patient/${patientId}`}>
          <Home className="w-6 h-6" />
        </Link>
        <h1 className="text-xl font-semibold">Add Orders</h1>
        <div className="w-6" />
      </div>

      {/* Instructions */}
      <div className="p-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-800">
            Type orders naturally: "metformin 500mg twice daily", "CBC with diff", "chest x-ray", etc.
          </p>
        </div>
      </div>

      {/* Order Input */}
      <div className="flex-1 p-4">
        <textarea
          value={orderText}
          onChange={(e) => setOrderText(e.target.value)}
          placeholder="Enter orders here..."
          className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366] resize-none"
        />

        <button
          onClick={handleParse}
          disabled={!orderText.trim() || parseMutation.isPending}
          className="mt-4 w-full py-3 bg-[#003366] text-white font-semibold rounded-lg disabled:opacity-50"
        >
          {parseMutation.isPending ? 'Parsing...' : 'Parse Orders'}
        </button>
      </div>

      {/* Parsed Orders */}
      {parsedOrders.length > 0 && (
        <div className="p-4 bg-white border-t">
          <h2 className="text-lg font-semibold mb-3">Parsed Orders</h2>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {parsedOrders.map((order, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded">
                <p className="text-sm font-medium">{order.type}: {order.name}</p>
                {order.details && (
                  <p className="text-xs text-gray-600 mt-1">{order.details}</p>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className="mt-4 w-full py-3 bg-[#FFD700] text-[#003366] font-semibold rounded-lg flex items-center justify-center"
          >
            <Send className="w-5 h-5 mr-2" />
            {submitMutation.isPending ? 'Submitting...' : 'Submit Orders'}
          </button>
        </div>
      )}
    </div>
  )
}