import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { simulatePaymentSuccess } from '../lib/paymentApi'

function PaymentButton({ booking, accessToken, onPaymentConfirmed }) {
  const [isPaying, setIsPaying] = useState(false)

  const handlePayment = async () => {
    if (isPaying) return

    setIsPaying(true)
    try {
      const result = await simulatePaymentSuccess(booking._id, accessToken)
      toast.success('Demo payment successful')
      onPaymentConfirmed?.(result)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to complete demo payment')
    } finally {
      setIsPaying(false)
    }
  }

  return (
    <div className="payment-actions">
      <button className="payment-button" type="button" onClick={handlePayment} disabled={isPaying} aria-busy={isPaying}>
        {isPaying ? <><span className="payment-button__spinner" />Processing demo payment...</> : 'Pay Now'}
      </button>
      <p className="demo-payment-note">Demo Payment - No actual money deducted.</p>
      <p className="payment-action-status">Payment status: <strong>{booking.status === 'BOOKED' ? 'SUCCESS' : 'PENDING PAYMENT'}</strong></p>
    </div>
  )
}

export default PaymentButton
