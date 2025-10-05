import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer site-footer--primary">
      <div className="footer-container">
        <div className="footer-hero">
          <div className="footer-brand">
            <span className="footer-logo">
              <img
                className="footer-logo-img"
                src="/assets/logo/LOGO NO BACKGROUND.png"
                alt="Mealkit logo"
              />
              <div id="nameSlogan" className="nameSlogan">
                <h1 className="h1-footer">MEALKIT</h1>
                <p className="p-footer">REAL MEAL, REAL FAST.</p>
              </div>
            </span>
            <p className="footer-desc">
              Fresh food logistics, market insights, and doorstep convenience for kitchens across Nigeria.
            </p>
            <div className="social-icons">
              <a href="#" aria-label="Facebook">
                <img src="/assets/icons/png/socials/facebook.png" alt="Facebook" />
              </a>
              <a href="#" aria-label="Twitter">
                <img src="/assets/icons/png/socials/x.png" alt="X" />
              </a>
              <a href="#" aria-label="Pinterest">
                <img src="/assets/icons/png/socials/pinterest.png" alt="Pinterest" />
              </a>
              <a href="#" aria-label="Instagram">
                <img src="/assets/icons/png/socials/instagram.png" alt="Instagram" />
              </a>
              <a href="#" aria-label="Google">
                <img src="/assets/icons/png/socials/google.png" alt="Google" />
              </a>
            </div>
          </div>

          <form className="footer-newsletter" action="#" method="post">
            <h3>Stay in the loop</h3>
            <p>Get weekly market updates, seasonal picks, and exclusive offers.</p>
            <div className="newsletter-field">
              <input
                type="email"
                name="newsletter-email"
                placeholder="Enter your email"
                aria-label="Email address"
                required
              />
              <button type="submit">Subscribe</button>
            </div>
            <small>No spam - just fresh food stories.</small>
          </form>
        </div>

        <div className="footer-links footer-links-grid">
          <div className="link-group">
            <h3>Company</h3>
            <ul>
              <li>
                <Link href="#">About Us</Link>
              </li>
              <li>
                <Link href="#">Blog</Link>
              </li>
              <li>
                <Link href="#">Contact Us</Link>
              </li>
              <li>
                <Link href="#">Career</Link>
              </li>
            </ul>
          </div>
          <div className="link-group">
            <h3>Customer Services</h3>
            <ul>
              <li>
                <Link href="/sign-in?tab=login#loginForm">My Account</Link>
              </li>
              <li>
                <Link href="#">Track Your Order</Link>
              </li>
              <li>
                <Link href="#">Return</Link>
              </li>
              <li>
                <Link href="/help-center">FAQ</Link>
              </li>
            </ul>
          </div>
          <div className="link-group">
            <h3>Our Information</h3>
            <ul>
              <li>
                <Link href="#">Privacy</Link>
              </li>
              <li>
                <Link href="#">Terms &amp; Conditions</Link>
              </li>
              <li>
                <Link href="#">Return Policy</Link>
              </li>
            </ul>
          </div>
          <div className="link-group">
            <h3>Contact</h3>
            <ul>
              <li>
                <a href="tel:+2349129296433">+234-91-2929-6433</a>
              </li>
              <li>
                <a href="mailto:mealkitltd@gmail.com">mealkitltd@gmail.com</a>
              </li>
              <li>No 8, Bell Air Estate<br />Akala Expressway, Ibadan</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {year} Mealkit. All rights reserved.</p>
          <div className="footer-choose">
            <label className="footer-select">
              <span className="footer-select__label">Language</span>
              <select defaultValue="English">
                <option>English</option>
                <option>French</option>
              </select>
            </label>
            <label className="footer-select">
              <span className="footer-select__label">Currency</span>
              <select defaultValue="NGN">
                <option>NGN</option>
                <option>USD</option>
              </select>
            </label>
          </div>
        </div>
      </div>
    </footer>
  );
}
