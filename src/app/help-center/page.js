'use client';

import { useState } from "react";

import HelpCenterFaqs from "@/components/help-center-faqs";
import styles from "./help-center.module.css";

const heroCards = [
  {
    label: "Place an Order",
    icon: "fa-bag-shopping",
    aria: "Place an order help",
  },
  {
    label: "Pay for Your Order",
    icon: "fa-credit-card",
    aria: "Payment help",
  },
  {
    label: "Track Your Order",
    icon: "fa-magnifying-glass-location",
    aria: "Track order help",
  },
  {
    label: "Cancel an Order",
    icon: "fa-ban",
    aria: "Cancel order help",
  },
  {
    label: "Create a Return",
    icon: "fa-rotate-left",
    aria: "Create a return help",
  },
];

const sidebarTopics = [
  { slug: "payments", icon: "fa-credit-card", label: "Payments" },
  { slug: "vouchers", icon: "fa-ticket", label: "Vouchers" },
  { slug: "delivery", icon: "fa-truck", label: "Delivery" },
  { slug: "returns", icon: "fa-rotate-left", label: "Returns & Refunds" },
  { slug: "products", icon: "fa-basket-shopping", label: "Products" },
  { slug: "express", icon: "fa-paper-plane", label: "MealKit Express" },
  { slug: "sell", icon: "fa-store", label: "Sell on MealKit" },
  { slug: "pickup", icon: "fa-location-dot", label: "Pickup Stations" },
];

const faqSections = [
  {
    slug: "payments",
    title: "Payments",
    description: "Popular questions about paying for your MealKit orders.",
    tag: "Payments",
    items: [
      {
        question: "What payment methods are accepted on MealKit?",
        answer:
          "We accept major debit and credit cards, MealKit wallet balance, and bank transfers handled by trusted payment partners. You can save a preferred payment method for faster checkout, and the total is shown before you confirm.",
      },
      {
        question: "How secure is my payment information on MealKit?",
        answer:
          "Payments are processed over encrypted connections that comply with PCI DSS standards. We never store your CVV, and you can enable multi-factor authentication for an extra layer of protection.",
      },
      {
        question: "What should I do if my payment is declined?",
        answer:
          "First double-check your card details and available balance. If the issue continues, try another payment method or reach out to your bank to authorise the transaction before placing the order again.",
      },
      {
        question: "Can I pay cash on delivery for my orders?",
        answer:
          "Cash on delivery is available in select cities. The option appears during checkout whenever your delivery address is covered. If it does not show, please choose an online payment method instead.",
      },
      {
        question: "What should I do if I have been charged twice?",
        answer:
          "Duplicate charges usually reverse automatically within a few hours. If the extra charge remains after 24 hours, share the transaction receipt with our support team so we can escalate a refund with your bank.",
      },
      {
        question: "How do I confirm that my payment went through?",
        answer:
          "You will receive both an in-app notification and an email receipt as soon as your payment is successful. You can also open the order details page to view the status of the payment in real time.",
      },
      {
        question: "What is MealKit Store Credit and how can I use it?",
        answer:
          "Store Credit is a flexible balance we add to your account whenever we issue a refund or run loyalty campaigns. You can apply it at checkout to cover part or all of an order; just select Store Credit as your payment option.",
      },
      {
        question: "Can I cancel my order and get my money back?",
        answer:
          "If your order is still being prepared, you can cancel it from the Orders page and the payment will be reversed instantly. Once the order is out for delivery, contact support and we will guide you through a return and refund.",
      },
      {
        question: "How long does it take for refunds to reflect?",
        answer:
          "Refunds to cards are processed within 3-7 business days depending on your bank. Store Credit refunds reflect immediately, and bank transfers usually arrive within 24 hours after we approve the request.",
      },
      {
        question: "Can I pay via bank transfer on delivery?",
        answer:
          'Yes, select "Pay with bank transfer" at checkout and follow the on-screen instructions. You will receive the transfer details and have 30 minutes to complete payment while the rider heads to your location.',
      },
    ],
  },
  {
    slug: "vouchers",
    title: "Vouchers & Promotions",
    description: "Everything you need to know about using promotional codes and gift vouchers.",
    tag: "Vouchers & Promotions",
    items: [
      {
        question: "Where can I enter a MealKit voucher code?",
        answer:
          'Enter your voucher under the "Have a promo code?" field in the cart before you check out. Once applied, you will see the discount reflected in your order summary immediately.',
      },
      {
        question: "Why is my voucher code showing as invalid?",
        answer:
          "Double-check for spelling, expiry dates, or minimum spend requirements. Some codes are limited to specific categories or user accounts. If it still fails, contact support with a screenshot of the error message.",
      },
      {
        question: "Can I use multiple vouchers on one order?",
        answer:
          "Only one voucher can be applied per order. If you have Store Credit or loyalty rewards, you can use those together with a voucher to maximise your savings.",
      },
      {
        question: "Do vouchers apply to delivery fees?",
        answer:
          "Most vouchers apply to items only unless otherwise stated. Look out for delivery-specific offers; when available, they automatically slash your delivery fee once the code is applied.",
      },
      {
        question: "What happens if I cancel an order made with a voucher?",
        answer:
          "Item refunds will be processed normally, and eligible vouchers are automatically reinstated to your account within 24 hours so you can reuse them before they expire.",
      },
    ],
  },
  {
    slug: "delivery",
    title: "Delivery & Fulfilment",
    description: "Guidance on delivery timelines, tracking your order, and receiving fresh produce.",
    tag: "Delivery & Fulfilment",
    items: [
      {
        question: "How long will it take to receive my MealKit order?",
        answer:
          "Same-day delivery is available for orders placed before 2pm within Lagos. Outside Lagos, delivery typically takes 24-72 hours depending on your location and preferred slot.",
      },
      {
        question: "How do I track the status of my delivery?",
        answer:
          "After dispatch, you will get an SMS and email with tracking details. You can also open the Orders page in your account to view live updates, rider contact information, and the delivery window.",
      },
      {
        question: "Can I change my delivery slot after placing an order?",
        answer:
          'Yes. If the order has not left our fulfilment centre, open the order details and choose "Reschedule delivery." You can pick another slot up to 24 hours in advance without extra charges.',
      },
      {
        question: "What should I do if I miss my delivery?",
        answer:
          "Our rider will attempt to contact you twice. If we still cannot reach you, the order is returned to the hub and we will get in touch to arrange a new slot. Re-delivery fees may apply for repeated attempts.",
      },
      {
        question: "Do you deliver chilled or frozen items safely?",
        answer:
          "Yes. Cold-chain items are packed with insulated liners and ice packs to maintain temperature standards. Please refrigerate or freeze them immediately upon delivery for optimal freshness.",
      },
    ],
  },
  {
    slug: "returns",
    title: "Returns & Refunds",
    description: "Steps to report an issue with your order and request replacements or refunds.",
    tag: "Returns & Refunds",
    items: [
      {
        question: "Which items are eligible for return?",
        answer:
          "We accept returns for packaged groceries, pantry items, and home essentials within 48 hours of delivery. Perishables can be reported within 6 hours if they arrive damaged or compromised.",
      },
      {
        question: "How do I start a return request?",
        answer:
          'Go to Orders, open the relevant order, and choose "Report a problem." Select the affected item, upload photos if possible, and submit. Our team responds within two business hours.',
      },
      {
        question: "What if an item is missing from my delivery?",
        answer:
          "Report the missing item through the order page or live chat within 24 hours. We will verify with the dispatch log and either send a replacement or issue a refund right away.",
      },
      {
        question: "How are refunds issued for returned items?",
        answer:
          "You can choose to receive Store Credit instantly or have the refund sent back to your original payment method. Bank and card refunds usually take 3-7 business days to reflect.",
      },
      {
        question: "Can I schedule a pickup for returns?",
        answer:
          "Yes. Once your return request is approved, you can book a free pickup slot from the order page or drop the items at the nearest MealKit pickup station within 48 hours.",
      },
    ],
  },
  {
    slug: "products",
    title: "Products & Availability",
    description: "Learn how we source fresh produce, handle substitutions, and keep you updated on stock.",
    tag: "Products & Availability",
    items: [
      {
        question: "How do you ensure the freshness of fruits and vegetables?",
        answer:
          "Our buyers visit partner farms at dawn and follow strict cold-chain handling from harvest to dispatch. Anything that fails our quality checks is removed before orders are packed.",
      },
      {
        question: "What happens if an item I ordered is out of stock?",
        answer:
          "We will notify you by SMS and email. You can choose an approved substitute, receive Store Credit, or request a refund to your original payment method directly from the order details page.",
      },
      {
        question: "Can I request special cuts or portion sizes?",
        answer:
          "Yes. Use the order notes field at checkout to specify slicing, dicing, or portion preferences. Our prep team will confirm if the request is possible before preparation begins.",
      },
      {
        question: "Do you carry organic or specialty items?",
        answer:
          "Organic, keto-friendly, and allergen-conscious products are labelled clearly in the catalogue. Filter by dietary preference or search for the label to discover the current range.",
      },
      {
        question: "How often do you restock popular products?",
        answer:
          "Every morning for produce and pantry staples, and twice weekly for specialty imports. Tap the Notify Me button on any sold-out item to get an alert the moment it returns.",
      },
    ],
  },
  {
    slug: "express",
    title: "MealKit Express",
    description: "Answers about our lightning-fast delivery service for urgent grocery runs.",
    tag: "MealKit Express",
    items: [
      {
        question: "What is MealKit Express?",
        answer:
          "MealKit Express is a 90-minute delivery service available in select Lagos neighbourhoods. Orders are fulfilled from micro-hubs to keep travel time and costs low.",
      },
      {
        question: "How do I know if Express is available for my location?",
        answer:
          "Enter your delivery address in the app. If Express coverage includes your area, you will see an Express badge on eligible products and delivery slots.",
      },
      {
        question: "Are all products available for Express delivery?",
        answer:
          "Only items stocked in the Express micro-hub qualify. You will see the Express badge on product cards that can be delivered within 90 minutes.",
      },
      {
        question: "Is there an extra fee for Express?",
        answer:
          "Express orders carry a flat delivery fee displayed at checkout. Free-delivery vouchers and loyalty perks apply automatically when they qualify.",
      },
      {
        question: "Can I combine Express and regular items in one order?",
        answer:
          "To guarantee the 90-minute window, Express items must be checked out separately. Regular catalogue items will remain in your cart for a standard delivery slot.",
      },
    ],
  },
  {
    slug: "sell",
    title: "Sell on MealKit",
    description: "Interested in becoming a MealKit vendor? Start here.",
    tag: "Sell on MealKit",
    items: [
      {
        question: "Who can apply to sell on MealKit?",
        answer:
          "We work with farmers, aggregators, and verified food brands that meet our safety and quality benchmarks. Both local producers and importers are welcome to apply.",
      },
      {
        question: "How do I begin the vendor onboarding process?",
        answer:
          "Submit the vendor application form at mealkit.ng/sell. Share your business registration, product catalogue, pricing, and recent quality certifications to speed up review.",
      },
      {
        question: "What fees or commissions should I expect?",
        answer:
          "MealKit charges a commission per sale that depends on the category. We provide detailed rates during onboarding and issue payments to vendors every Monday.",
      },
      {
        question: "Will MealKit handle delivery and packaging?",
        answer:
          "You can choose to fulfil orders yourself or opt into MealKit Fulfilment, where we store, package, and deliver your products for a logistics fee.",
      },
      {
        question: "How do I keep track of my performance?",
        answer:
          "Vendors get access to the Seller Hub dashboard with analytics on sales, returns, and customer ratings plus tools to manage inventory in real time.",
      },
    ],
  },
  {
    slug: "pickup",
    title: "Pickup Stations",
    description: "Convenient collection points if you prefer to grab your order on the go.",
    tag: "Pickup Stations",
    items: [
      {
        question: "Where are MealKit pickup stations located?",
        answer:
          "Pickup stations operate across major Lagos districts including Victoria Island, Lekki, Ikeja, and Yaba. Check the app for the station closest to you.",
      },
      {
        question: "How do I select a pickup station during checkout?",
        answer:
          "Choose Pickup and enter your preferred area. Available stations with time slots will appear. Select one to reserve your pickup window before confirming payment.",
      },
      {
        question: "How long will my order stay at the pickup station?",
        answer:
          "Orders remain available for 24 hours after your selected slot. For chilled or frozen items, we recommend collecting within 6 hours to maintain quality.",
      },
      {
        question: "Can someone else pick up my order?",
        answer:
          "Yes. Share the pickup code and the recipient's full name in the order notes. They must present the code and a matching ID to complete collection.",
      },
      {
        question: "What happens if I miss my pickup window?",
        answer:
          "Uncollected orders are returned to our fulfilment centre. We will contact you to arrange a new pickup slot or convert the order to delivery for an additional fee.",
      },
    ],
  },
];

export default function HelpCenterPage() {
  const [searchValue, setSearchValue] = useState("");

  const handleSearchSubmit = (event) => {
    event.preventDefault();
  };

  return (
    <div className={styles.pageWrapper}>
      <main>
        <section id="heroHelpCenter" className={styles.heroHelpCenter}>
          <div className={styles.heroBoard}>
            <div className={styles.heroText}>
              <h3 className={styles.heroEyebrow}>Help Center</h3>
              <h2 className={styles.heroTitle}>Hi, how can we help you?</h2>
              <p className={styles.heroSubtitle}>
                Select a quick action to jump straight to detailed answers.
              </p>
            </div>
            <div className={styles.heroCards}>
              {heroCards.map((card) => (
                <a
                  key={card.label}
                  className={styles.heroCard}
                  href="#searchQnAAgent"
                  aria-label={card.aria}
                >
                  <span className={styles.heroCardText}>{card.label}</span>
                  <span className={styles.heroCardIcon}>
                    <span className={styles.heroCardBadge}>
                      <i className={`fa-solid ${card.icon}`} aria-hidden="true" />
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section id="searchQnAAgent" className={styles.searchQnAAgent}>
          <div className={styles.searchQnAAgentInner}>
            <form className={styles.searchBarShell} onSubmit={handleSearchSubmit}>
              <input
                type="search"
                id="help-search"
                className={styles.searchInput}
                placeholder='Type a keyword like "track"'
                aria-label="Search help articles"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
              />
              <button type="submit" className={styles.searchButton}>
                <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                <span className="sr-only">Search help center</span>
              </button>
            </form>

            <HelpCenterFaqs sidebarTopics={sidebarTopics} sections={faqSections} searchQuery={searchValue} />
          </div>
        </section>

        <section className={styles.talkToAgent}>
          <div className={styles.talkToAgentWrapper}>
            <header className={styles.talkToAgentHeader}>
              <p className={styles.talkToAgentEyebrow}>Need more help?</p>
              <h2>Talk to an agent</h2>
              <p className={styles.talkToAgentSubtitle}>
                Connect with a team member right away for anything you cannot find in the FAQs.
              </p>
            </header>
            <div className={styles.talkToAgentGrid}>
              <article className={styles.agentCard}>
                <span className={styles.agentIcon}>
                  <i className="fa-solid fa-comments" aria-hidden="true" />
                </span>
                <h3>Live Chat</h3>
                <p>
                  Send a quick message and get real-time support for orders, payments, or product questions.
                </p>
                <ul className={styles.agentList}>
                  <li>Available daily from 7:00am - 10:00pm WAT</li>
                  <li>Average response time under 2 minutes</li>
                </ul>
                <a className={styles.agentCta} href="#">
                  Start chat
                </a>
              </article>

              <article className={`${styles.agentCard} ${styles.agentCardCall}`}>
                <span className={styles.agentIcon}>
                  <i className="fa-solid fa-phone" aria-hidden="true" />
                </span>
                <h3>Call Customer Care</h3>
                <p>
                  Prefer to speak with someone? Reach a MealKit specialist for urgent assistance.
                </p>
                <ul className={styles.agentList}>
                  <li>
                    <a href="tel:+2349129296433">+(234) 91 2929 6433</a>
                  </li>
                  <li>
                    <a href="tel:+2348118287047">+(234) 81 1828 7047</a>
                  </li>
                </ul>
                <span className={styles.agentNote}>
                  Lines open Monday - Saturday, 8:00am - 8:00pm WAT.
                </span>
              </article>
            </div>
          </div>
        </section>

        <section className="downloadAppSec">
          <div className="downloadAppFlex">
            <div className="downloadAppTB">
              <div className="phoneWrapper">
                <img src="/assets/img/apple.png" alt="Download on App Store" className="phone phone-apple" />
                <img src="/assets/img/android.png" alt="Download on Play Store" className="phone phone-android" />
              </div>
              <div className="appTextndButtons">
                <h2>Download App</h2>
                <p className="appPar">
                  Get our mobile app to shop fresh produce, meats, grains, and pantry staples anytime. Track orders, unlock exclusive deals, and receive real-time updates right from your phone.
                </p>
                <div className="buttonHolder">
                  <img src="/assets/img/apple store.png" alt="Download on the App Store" />
                  <img src="/assets/img/play store.png" alt="Get it on Google Play" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
