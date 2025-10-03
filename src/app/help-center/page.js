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
  { icon: "fa-credit-card", label: "Payments" },
  { icon: "fa-ticket", label: "Vouchers" },
  { icon: "fa-truck", label: "Delivery" },
  { icon: "fa-rotate-left", label: "Returns & Refunds" },
  { icon: "fa-basket-shopping", label: "Products" },
  { icon: "fa-paper-plane", label: "MealKit Express" },
  { icon: "fa-store", label: "Sell on MealKit" },
  { icon: "fa-location-dot", label: "Pickup Stations" },
];

const faqs = [
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
      "Store Credit is a flexible balance we add to your account whenever we issue a refund or run loyalty campaigns. You can apply it at checkout to cover part or all of an order-just select Store Credit as your payment option.",
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
      "Yes, select \"Pay with bank transfer\" at checkout and follow the on-screen instructions. You will receive the transfer details and have 30 minutes to complete payment while the rider heads to your location.",
  },
];

export default function HelpCenterPage() {
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
                  className={`${styles.heroCard}`}
                  href="#searchQnAAgent"
                  aria-label={card.aria}
                >
                  <span className={styles.heroCardText}>{card.label}</span>
                  <span className={styles.heroCardIcon}>
                    <span className={styles.heroCardBadge}>
                      <i className={`fa-solid ${card.icon}`}></i>
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section id="searchQnAAgent" className={styles.searchQnAAgent}>
          <div className={styles.searchQnAAgentInner}>
            <div className={styles.searchBarShell}>
              <input
                type="search"
                id="help-search"
                className={styles.searchInput}
                placeholder='Type a keyword like "track"'
                aria-label="Search help articles"
              />
              <button type="button" className={styles.searchButton}>
                <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
                <span className="sr-only">Search help center</span>
              </button>
            </div>

            <div className={styles.qna}>
              <aside className={styles.sidebar}>
                <h4 className={styles.sidebarTitle}>Browse Topics</h4>
                <ul className={styles.sidebarList}>
                  {sidebarTopics.map((topic, index) => (
                    <li key={topic.label}>
                      <button
                        type="button"
                        className={`${styles.sidebarItem} ${index === 0 ? styles.sidebarItemActive : ""}`.trim()}
                      >
                        <span className={styles.sidebarIcon}>
                          <i className={`fa-solid ${topic.icon}`} aria-hidden="true"></i>
                        </span>
                        <span>{topic.label}</span>
                        <i className={`fa-solid fa-angle-right ${styles.sidebarArrow}`} aria-hidden="true"></i>
                      </button>
                    </li>
                  ))}
                </ul>
              </aside>

              <div className={styles.qnaContent}>
                <header className={styles.qnaContentHeader}>
                  <h3>Payments</h3>
                  <p>Popular questions about paying for your MealKit orders.</p>
                </header>
                <div className={styles.qnaAccordion}>
                  {faqs.map((faq, index) => (
                    <details key={faq.question} className={styles.qnaItem} open={index === 0}>
                      <summary>
                        <span className={styles.questionMeta}>Payments</span>
                        <span className={styles.questionText}>{faq.question}</span>
                      </summary>
                      <div className={styles.answer}>
                        <p>{faq.answer}</p>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </div>
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
                  <i className="fa-solid fa-comments" aria-hidden="true"></i>
                </span>
                <h3>Live Chat</h3>
                <p>
                  Send a quick message and get real-time support for orders, payments, or product questions.
                </p>
                <ul className={styles.agentList}>
                  <li>Available daily from 7:00am - 10:00pm WAT</li>
                  <li>Average response time under 2 minutes</li>
                </ul>
                <a className={styles.agentCta} href="#">Start chat</a>
              </article>

              <article className={`${styles.agentCard} ${styles.agentCardCall}`}>
                <span className={`${styles.agentIcon}`}>
                  <i className="fa-solid fa-phone" aria-hidden="true"></i>
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
                    <a href="tel:\+2348118287047">+(234) 81 1828 7047</a>
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


