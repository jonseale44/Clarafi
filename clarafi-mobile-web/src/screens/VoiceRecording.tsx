import React, { useState, useRef } from 'react'
import { Mic, Square, Send, Home } from 'lucide-react'
import { Link } from 'wouter'

export default function VoiceRecording() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [duration, setDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        // Here you would send audioBlob to your transcription API
        setTranscript('Recording complete. Transcription will appear here...')
      }

      mediaRecorder.start()
      setIsRecording(true)
      setDuration(0)

      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1)
      }, 1000)
    } catch (error) {
      alert('Could not access microphone')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      setIsRecording(false)
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const generateSOAP = () => {
    // API call to generate SOAP note
    alert('SOAP note generation would happen here')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-[#003366] text-white p-4 flex items-center justify-between">
        <Link href="/">
          <Home className="w-6 h-6" />
        </Link>
        <h1 className="text-xl font-semibold">Voice Recording</h1>
        <div className="w-6" />
      </div>

      {/* Recording Controls */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`w-32 h-32 rounded-full flex items-center justify-center shadow-lg transition-colors ${
            isRecording ? 'bg-red-500' : 'bg-[#003366]'
          }`}
        >
          {isRecording ? (
            <Square className="w-12 h-12 text-white" />
          ) : (
            <Mic className="w-12 h-12 text-white" />
          )}
        </button>

        {isRecording && (
          <div className="mt-6 text-2xl font-mono text-gray-700">
            {formatDuration(duration)}
          </div>
        )}

        <p className="mt-4 text-gray-600">
          {isRecording ? 'Recording...' : 'Tap to start recording'}
        </p>
      </div>

      {/* Transcription */}
      {transcript && (
        <div className="p-6 bg-white border-t">
          <h2 className="text-lg font-semibold mb-3">Transcription</h2>
          <div className="bg-gray-50 p-4 rounded-lg min-h-[100px] max-h-[200px] overflow-y-auto">
            <p className="text-gray-700">{transcript}</p>
          </div>
          
          <button
            onClick={generateSOAP}
            className="mt-4 w-full py-3 bg-[#FFD700] text-[#003366] font-semibold rounded-lg flex items-center justify-center"
          >
            <Send className="w-5 h-5 mr-2" />
            Generate SOAP Note
          </button>
        </div>
      )}
    </div>
  )
}