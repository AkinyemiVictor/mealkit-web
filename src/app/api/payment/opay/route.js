import axios from "axios";
import NodeRSA from "node-rsa";
import crypto from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Supabase config
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// OPay config
const OPayBaseURL = "https://payapi.opayweb.com";
const OPayClientKey = process.env.OPAY_CLIENT_KEY;
const OPayPublicKey = process.env.OPAY_PUBLIC_KEY;
const MerchantPrivateKey = process.env.OPAY_MERCHANT_PRIVATE_KEY;
const CallbackURL = `${process.env.NEXT_PUBLIC_SITE_URL}/api/payments/opay/webhook`;

// Encrypt and sign helpers
const rsaEncrypt = (data) => {
  const rsa = new NodeRSA(OPayPublicKey);
  rsa.setOptions({ encryptionScheme: "pkcs1" });
  return rsa.encrypt(JSON.stringify(data), "base64");
};

const rsaSign = (data) => {
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(data);
  return sign.sign(MerchantPrivateKey, "base64");
};

//  Create Payment
export async function POST(req) {
  try {
    const { orderId, amount, currency, userEmail } = await req.json();

    // Save pending order in Supabase
    await supabase.from("orders").insert([
      {
        order_id: orderId,
        user_email: userEmail,
        total_amount: amount,
        status: "pending",
      },
    ]);

    const orderPayload = {
      headMerchantId: process.env.OPAY_HEAD_MERCHANT_ID,
      merchantId: process.env.OPAY_MERCHANT_ID,
      outOrderNo: orderId,
      amount: amount,
      currency: currency || "NGN",
      orderExpireTime: 300,
      sceneEnum: "CASH_API",
      subSceneEnum: "ONLINE",
      sn: "WEB",
      productInfo: {
        productName: "MealKit Order",
        productDesc: "Farm product purchase",
      },
      returnUrl: CallbackURL,
    };

    const paramContent = rsaEncrypt(orderPayload);
    const sign = rsaSign(paramContent + Date.now());

    const headers = {
      clientAuthKey: OPayClientKey,
      version: "V1.0.1",
      bodyFormat: "JSON",
      timestamp: Date.now().toString(),
    };

    const res = await axios.post(
      `${OPayBaseURL}/openApi/order/checkout/createOrder`,
      { paramContent, sign },
      { headers }
    );

    return NextResponse.json({
      status: "success",
      message: "Payment initialized",
      data: res.data,
    });
  } catch (err) {
    console.error("Create Payment Error:", err.message);
    return NextResponse.json(
      { status: "error", message: err.message },
      { status: 500 }
    );
  }
}

//  Handle Webhook Callback
export async function PUT(req) {
  try {
    const body = await req.json();
    const { code, message, data } = body;

    // 1. Check payment status
    if (code === "00000" && message === "SUCCESSFUL") {
      const orderNo = data?.orderNo;

      // 2. Update order status in Supabase
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .update({ status: "paid" })
        .eq("order_id", orderNo)
        .select();

      if (orderErr) throw new Error(orderErr.message);

      // 3. Decrease product stock for all purchased items
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("product_id, quantity")
        .eq("order_id", orderNo);

      if (orderItems && orderItems.length > 0) {
        for (const item of orderItems) {
          await supabase.rpc("decrease_product_stock", {
            product_id_input: item.product_id,
            quantity_input: item.quantity,
          });
        }
      }

      console.log("✅ Payment verified and stock updated:", orderNo);
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err.message);
    return new Response("FAIL", { status: 400 });
  }
}
