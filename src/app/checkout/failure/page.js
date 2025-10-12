import CheckoutReceipt from "@/components/checkout-receipt";
import copy from "@/data/copy";

export const metadata = {
  title: "MealKit | Payment unsuccessful",
  description: "We could not confirm your payment.",
};

export default function CheckoutFailurePage({ searchParams }) {
  const reason =
    typeof searchParams?.reason === "string" && searchParams.reason.trim()
      ? searchParams.reason.trim()
      : undefined;

  return (
    <main className="checkout-page" aria-labelledby="checkout-failure-heading">
      <header className="checkout-header">
        <div>
          <span className="checkout-eyebrow">{copy.checkout.eyebrow}</span>
          <h1 id="checkout-failure-heading">{copy.checkout.receiptPage.failureHeading}</h1>
          <p>{copy.checkout.receiptPage.failureSubheading}</p>
          {reason ? <p className="checkout-summary__unit">{reason}</p> : null}
        </div>
      </header>

      <CheckoutReceipt status="failure" reason={reason} />
    </main>
  );
}
