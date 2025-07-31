import ProcessMapperClient from './ProcessMapperClient'

export default function ProcessMapperPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Process Mapper</h1>
        <p className="text-gray-600 mt-2">
          Create sequences on the fly as you work. Capture real-time process steps, decision points, and timing data.
        </p>
      </div>
      
      <ProcessMapperClient />
    </div>
  )
} 