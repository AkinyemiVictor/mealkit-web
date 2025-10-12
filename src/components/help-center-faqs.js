"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "@/app/help-center/help-center.module.css";

export default function HelpCenterFaqs({ sidebarTopics, sections }) {
  const sectionMap = useMemo(() => {
    const map = new Map();
    sections.forEach((section) => {
      map.set(section.slug, section);
    });
    return map;
  }, [sections]);

  const defaultSlug =
    sidebarTopics.find((topic) => sectionMap.has(topic.slug))?.slug ??
    (sections.length ? sections[0].slug : null);

  const [activeSlug, setActiveSlug] = useState(defaultSlug);
  const activeSection = (activeSlug && sectionMap.get(activeSlug)) || sections[0] || null;
  const [activeQuestion, setActiveQuestion] = useState(
    activeSection?.items?.[0]?.question ?? null
  );

  useEffect(() => {
    setActiveQuestion(activeSection?.items?.[0]?.question ?? null);
  }, [activeSection]);

  if (!activeSection) {
    return null;
  }

  return (
    <div className={styles.qna}>
      <aside className={styles.sidebar}>
        <h4 className={styles.sidebarTitle}>Browse Topics</h4>
        <ul className={styles.sidebarList}>
          {sidebarTopics.map((topic) => {
            const isActive = topic.slug === activeSection.slug;
            const className = `${styles.sidebarItem} ${isActive ? styles.sidebarItemActive : ""}`.trim();
            return (
              <li key={topic.slug}>
                <button
                  type="button"
                  className={className}
                  onClick={() => setActiveSlug(topic.slug)}
                  aria-current={isActive ? "true" : undefined}
                >
                  <span className={styles.sidebarIcon}>
                    <i className={`fa-solid ${topic.icon}`} aria-hidden="true" />
                  </span>
                  <span>{topic.label}</span>
                  <i className={`fa-solid fa-angle-right ${styles.sidebarArrow}`} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <div className={styles.qnaContent}>
        <header className={styles.qnaContentHeader}>
          <h3>{activeSection.title}</h3>
          <p>{activeSection.description}</p>
        </header>
        <div className={styles.qnaAccordion}>
          {activeSection.items.map((faq) => {
            const isOpen = activeQuestion === faq.question;
            return (
              <details key={faq.question} className={styles.qnaItem} open={isOpen}>
                <summary
                  onClick={(event) => {
                    event.preventDefault();
                    setActiveQuestion((current) => (current === faq.question ? null : faq.question));
                  }}
                  aria-expanded={isOpen}
                >
                  <span className={styles.questionMeta}>{activeSection.tag || activeSection.title}</span>
                  <span className={styles.questionText}>{faq.question}</span>
                </summary>
                <div className={styles.answer}>
                  <p>{faq.answer}</p>
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </div>
  );
}
