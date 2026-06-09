export default function TrackingPage({ params }: { params: { orderId: string } }) {
  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: 24, fontWeight: 700 }}>
        Tracking #{params.orderId}
      </h1>
      <p style={{ color: '#6b7280', marginTop: 8 }}>Coming soon</p>
    </div>
  )
}
