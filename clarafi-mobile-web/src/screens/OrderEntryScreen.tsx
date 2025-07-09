import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { ChevronLeft, Send } from 'lucide-react'

const OrderEntryScreen: React.FC = () => {
  const { patientId, encounterId } = useParams()
  const navigate = useNavigate()
  const [orderText, setOrderText] = useState('')
  const [parsedOrders, setParsedOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const parseOrders = async () => {
    if (!orderText.trim()) return

    setLoading(true)
    try {
      const response = await axios.post('/api/parse-orders', {
        text: orderText,
        patientId,
        encounterId
      }, { withCredentials: true })
      
      setParsedOrders(response.data.orders || [])
    } catch (error) {
      console.error('Error parsing orders:', error)
      alert('Failed to parse orders')
    } finally {
      setLoading(false)
    }
  }

  const submitOrders = async () => {
    setLoading(true)
    try {
      await axios.post(`/api/patients/${patientId}/encounters/${encounterId}/orders`, {
        orders: parsedOrders
      }, { withCredentials: true })
      
      navigate(`/patient/${patientId}`)
    } catch (error) {
      console.error('Error submitting orders:', error)
      alert('Failed to submit orders')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-navy-blue text-white p-4">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="mr-3">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">Order Entry</h1>
        </div>
      </div>

      <div className="p-4">
        {/* Natural Language Input */}
        <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter orders in natural language
          </label>
          <textarea
            value={orderText}
            onChange={(e) => setOrderText(e.target.value)}
            placeholder="Example: metformin 500mg BID for diabetes, CBC and BMP today, chest x-ray for cough"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-navy-blue focus:border-navy-blue"
          />
          <button
            onClick={parseOrders}
            disabled={loading || !orderText.trim()}
            className="mt-3 bg-gold hover:bg-yellow-600 text-navy-blue font-medium py-2 px-4 rounded-md disabled:opacity-50"
          >
            Parse Orders
          </button>
        </div>

        {/* Parsed Orders */}
        {parsedOrders.length > 0 && (
          <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
            <h2 className="font-semibold text-gray-900 mb-3">Parsed Orders</h2>
            <div className="space-y-3">
              {parsedOrders.map((order, index) => (
                <div key={index} className="border-b pb-2 last:border-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{order.name}</p>
                      <p className="text-sm text-gray-600">
                        Type: <span className="capitalize">{order.type}</span>
                      </p>
                      {order.details && (
                        <p className="text-sm text-gray-600">{order.details}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit Button */}
        {parsedOrders.length > 0 && (
          <button
            onClick={submitOrders}
            disabled={loading}
            className="w-full bg-navy-blue text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            Submit Orders
          </button>
        )}

        {loading && (
          <div className="text-center mt-6">
            <div className="text-gray-500">Processing...</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default OrderEntryScreen