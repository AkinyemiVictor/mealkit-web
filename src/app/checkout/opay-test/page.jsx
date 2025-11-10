"use client";
import { useState } from "react";

export default function OPayTestPage() {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  const handlePayment = async () => {
    if (!amount || !email) {
      alert("Please enter amount and email");
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      const orderId = `ORDER-${Date.now()}`;

      const res = await fetch("/api/payments/opay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, amount, currency: "NGN", userEmail: email }),
      });

      const data = await res.json();
      if (data.status === "success") {
        const orderData = data.data?.data || {};
        const paymentUrl = orderData.paymentUrl || orderData?.data?.redirectUrl;
        if (paymentUrl) {
          window.location.href = paymentUrl;
        } else {
          setStatus("Could not get OPay payment link. Check API response.");
        }
      } else {
        setStatus("Payment initialization failed.");
      }
    } catch (err) {
      console.error("Payment Error:", err);
      setStatus("An error occurred while initializing payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
      <div className="bg-white shadow-md rounded-2xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-green-600">OPay Test</h2>
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
          />
          <input
            type="number"
            placeholder="Enter amount (₦)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
          />
          <button
            onClick={handlePayment}
            disabled={loading}
            className={`w-full py-3 text-white rounded-lg font-semibold transition ${loading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"}`}
          >
            {loading ? "Processing..." : "Pay with OPay"}
          </button>
          {status && <p className="text-center mt-4 text-sm text-gray-600">{status}</p>}
        </div>
      </div>
    </div>
  );
}

