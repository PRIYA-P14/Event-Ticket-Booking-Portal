import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { createPaymentOrder, verifyPayment } from '../lib/paymentApi'

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js'

const loadRazorpay = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = RAZORPAY_SCRIPT_URL
    script.onload = resolve
    script.onerror = () => reject(new Error('Unable to load Razorpay Checkout'))
    document.body.appendChild(script)
  })

function PaymentButton({ booking, accessToken, onPaymentConfirmed }) {
  const [isPaying, setIsPaying] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState(
    booking.status === 'BOOKED' ? 'CAPTURED' : 'PENDING_PAYMENT',
  )

  const handlePayment = async () => {
    if (isPaying) return

    setIsPaying(true)
    try {
      const checkout = await createPaymentOrder(booking._id, accessToken)
      await loadRazorpay()

      const razorpay = new window.Razorpay({
        key: checkout.key,
        amount: checkout.amount,
        currency: checkout.currency,
        name: 'Event Ticket Booking Portal',
        description: booking.eventId?.title || booking.bookingReference,
        order_id: checkout.orderId,
        handler: async (response) => {
          try {
            const result = await verifyPayment(response, accessToken)
            setPaymentStatus('CAPTURED')
            toast.success('Payment confirmed successfully')
            onPaymentConfirmed?.(result)
          } catch {
            toast.error('Payment could not be verified. Please contact support.')
          } finally {
            setIsPaying(false)
          }
        },
        modal: {
          ondismiss: () => setIsPaying(false),
        },
      })

      razorpay.on('payment.failed', () => {
        toast.error('Payment failed. Please try again.')
        setIsPaying(false)
      })
      razorpay.open()
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Unable to start payment')
      setIsPaying(false)
    }
  }

  return (
    <div className="payment-actions">
      <button className="payment-button" type="button" onClick={handlePayment} disabled={isPaying} aria-busy={isPaying}>
        {isPaying ? <><span className="payment-button__spinner" />Processing payment...</> : 'Pay Now'}
      </button>
      <p className="payment-action-status">
        Payment status: <strong>{paymentStatus === 'CAPTURED' ? 'CAPTURED' : 'PENDING PAYMENT'}</strong>
      </p>
    </div>
  )
}

export default PaymentButton
