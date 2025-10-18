from pathlib import Path
import re

path = Path('src/styles/main.css')
text = path.read_text()

new_css = """
.site-header {
  margin: 2rem auto 1.5rem;
  padding: 1.5rem 2rem;
  max-width: 1200px;
  border-radius: 24px;
  border: 1px solid var(--mk-border);
  background: var(--mk-surface);
  box-shadow: 0 24px 64px rgba(24, 39, 52, 0.12);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  position: relative;
  z-index: 10;
}

.site-header__inner {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.site-header__brand {
  display: inline-flex;
  align-items: center;
  gap: 1rem;
  color: inherit;
  text-decoration: none;
  flex-shrink: 0;
}

.site-header__brand img {
  width: 64px;
  height: 64px;
  object-fit: contain;
}

.site-header__brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
  gap: 0.25rem;
}

.site-header__brand-name {
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--mk-accent);
}

.site-header__brand-tagline {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--mk-text-subtle);
}

.site-header__search {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1 1 320px;
  min-width: 0;
  border-radius: 999px;
  border: 1px solid var(--mk-border);
  background: var(--mk-surface-muted);
  padding: 0.45rem 0.5rem 0.45rem 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.site-header__search--mobile {
  display: none;
}

.site-header__search:focus-within {
  border-color: rgba(0, 172, 17, 0.45);
  background: var(--mk-surface);
  box-shadow: 0 18px 36px rgba(0, 172, 17, 0.18);
}

.site-header__search-input {
  flex: 1 1 auto;
  min-width: 0;
  background: transparent;
  border: none;
  color: var(--mk-text);
  font-size: 0.95rem;
  font-weight: 500;
  outline: none;
}

.site-header__search-input::placeholder {
  color: var(--mk-text-subtle);
  opacity: 0.65;
}

.site-header__search-button {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  border: none;
  background: var(--mk-accent);
  color: var(--mk-accent-contrast);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
  box-shadow: 0 14px 32px rgba(0, 172, 17, 0.28);
}

.site-header__search-button:hover,
.site-header__search-button:focus-visible {
  background: #00910d;
  transform: translateY(-1px);
  box-shadow: 0 18px 40px rgba(0, 145, 13, 0.32);
}

.site-header__search-button:focus-visible {
  outline: 2px solid rgba(0, 172, 17, 0.45);
  outline-offset: 2px;
}

.site-header__actions {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  flex: 0 0 auto;
}

.site-header__account {
  position: relative;
}

.site-header__action {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.55rem 1rem;
  border-radius: 999px;
  border: 1px solid transparent;
  background: var(--mk-surface);
  color: var(--mk-text);
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, color 0.2s ease, background-color 0.2s ease;
  box-shadow: 0 16px 36px rgba(24, 39, 52, 0.08);
}

.site-header__action:hover,
.site-header__action:focus-visible,
.site-header__action.is-open {
  border-color: rgba(0, 172, 17, 0.35);
  color: var(--mk-accent);
  transform: translateY(-1px);
  box-shadow: 0 18px 42px rgba(0, 172, 17, 0.16);
}

.site-header__action:focus-visible {
  outline: none;
}

.site-header__icon {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 172, 17, 0.12);
  color: var(--mk-accent);
  transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
  flex-shrink: 0;
}

.site-header__action:hover .site-header__icon,
.site-header__action:focus-visible .site-header__icon,
.site-header__action.is-open .site-header__icon {
  background: var(--mk-accent);
  color: var(--mk-accent-contrast);
  transform: scale(1.05);
}

.site-header__label {
  font-size: 0.96rem;
  font-weight: 600;
  line-height: 1.1;
}

.site-header__caret {
  color: inherit;
  stroke: currentColor;
  transition: transform 0.2s ease;
}

.site-header__action.is-open .site-header__caret {
  transform: rotate(180deg);
}

.site-header__badge {
  min-width: 1.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  background: var(--mk-accent);
  color: var(--mk-accent-contrast);
  font-size: 0.7rem;
  font-weight: 700;
  text-align: center;
  box-shadow: 0 14px 32px rgba(0, 172, 17, 0.35);
}

.site-header__account-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 0.75rem);
  width: 220px;
  padding: 0.75rem;
  border-radius: 16px;
  border: 1px solid var(--mk-border);
  background: var(--mk-surface);
  box-shadow: 0 24px 48px rgba(24, 39, 52, 0.16);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-8px);
  transition: opacity 0.18s ease, transform 0.18s ease;
  z-index: 20;
}

.site-header__account-menu.is-visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.site-header__account-link {
  padding: 0.6rem 0.75rem;
  border-radius: 12px;
  font-weight: 600;
  color: var(--mk-text);
  text-decoration: none;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.site-header__account-link:hover,
.site-header__account-link:focus-visible {
  background: rgba(0, 172, 17, 0.12);
  color: var(--mk-accent);
  outline: none;
}

@media (max-width: 1024px) {
  .site-header {
    padding: 1.3rem 1.5rem;
    gap: 1rem;
  }

  .site-header__inner {
    gap: 1rem;
  }
}

@media (max-width: 900px) {
  .site-header__inner {
    flex-wrap: wrap;
  }

  .site-header__actions {
    margin-left: auto;
  }
}

@media (max-width: 768px) {
  .site-header {
    margin: 1.5rem auto 1rem;
    padding: 1.1rem 1.25rem;
    border-radius: 20px;
  }

  .site-header__inner {
    width: 100%;
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .site-header__brand {
    width: 100%;
  }

  .site-header__search--inline {
    display: none;
  }

  .site-header__search--mobile {
    display: flex;
    width: 100%;
  }

  .site-header__actions {
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .site-header__action {
    flex: 1 1 calc(50% - 0.75rem);
    justify-content: center;
  }

  .site-header__badge {
    position: relative;
    top: auto;
    right: auto;
  }

  .site-header__account {
    width: 100%;
  }

  .site-header__account-menu {
    width: 100%;
    left: 0;
    right: 0;
    transform: translateY(-8px);
  }

  .site-header__account-menu.is-visible {
    transform: translateY(0);
  }
}

@media (max-width: 540px) {
  .site-header__actions {
    gap: 0.75rem;
    flex-direction: column;
    align-items: stretch;
  }

  .site-header__action {
    width: 100%;
    justify-content: space-between;
  }

  .site-header__badge {
    margin-left: auto;
  }
}
"""

new_css = new_css.strip('\n').replace('\n', '\r\n') + '\r\n\r\n'

pattern = re.compile(r"\.mobile-search-container\s*\{.*?\.searchButton i\s*\{.*?\}\s*\}\s*", re.S)
if not pattern.search(text):
  raise SystemExit("Header styles block not found; aborting")

text = pattern.sub(new_css, text, count=1)

media_pattern = re.compile(r"@media all and \(max-width: 800px\) \{.*?\}\s*", re.S)
text = media_pattern.sub('', text)

path.write_text(text, encoding='utf-8')
