const fs = require("fs");
const filePath = "src/app/page.js";
let text = fs.readFileSync(filePath, "utf8");

const categoriesStart = text.indexOf('      <section className="category-carousel"');
const categoriesEnd = text.indexOf('      <ProductSection', categoriesStart);
if (categoriesStart === -1 || categoriesEnd === -1) {
  throw new Error("Unable to locate category carousel block");
}

const lines = [
  '      <section className="category-carousel" aria-labelledby="category-carousel-heading">',
  '        <div className="category-carousel__header">',
  '          <h2 id="category-carousel-heading">Categories</h2>',
  '          <div className="category-carousel__actions">',
  '            <button',
  '              type="button"',
  '              className="category-carousel__arrow category-carousel__arrow--prev"',
  '              onClick={() => scrollCategories(-280)}',
  '              aria-label="Scroll categories left"',
  '            >',
  '              <svg viewBox="0 0 24 24" className="category-carousel__arrow-icon" xmlns="http://www.w3.org/2000/svg">',
  '                <path d="M15 18l-6-6 6-6" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />',
  '              </svg>',
  '            </button>',
  '            <button',
  '              type="button"',
  '              className="category-carousel__arrow category-carousel__arrow--next"',
  '              onClick={() => scrollCategories(280)}',
  '              aria-label="Scroll categories right"',
  '            >',
  '              <svg viewBox="0 0 24 24" className="category-carousel__arrow-icon" xmlns="http://www.w3.org/2000/svg">',
  '                <path d="M9 6l6 6-6 6" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />',
  '              </svg>',
  '            </button>',
  '          </div>',
  '        </div>',
  '',
  '        <div className="category-carousel__viewport" ref={categoryRef} role="presentation">',
  '          <ul className="category-carousel__track" role="list">',
  '            {categoryCards.map((category) => (',
  '              <li key={category.id} className="category-carousel__item">',
  '                <Link id={category.id} className="category-carousel__card" href={category.href}">',
  '                  <span className="category-carousel__card-icon" aria-hidden="true">',
  '                    <i className={`fa-solid ${category.icon}`} aria-hidden="true" />',
  '                  </span>',
  '                  <span className="category-carousel__card-label">{category.label}</span>',
  '                </Link>',
  '              </li>',
  '            ))}',
  '          </ul>',
  '        </div>',
  '      </section>',
  ''
];

const newCategoriesBlock = lines.join("\n");

text = text.slice(0, categoriesStart) + newCategoriesBlock + '\n' + text.slice(categoriesEnd);

fs.writeFileSync(filePath, text, "utf8");
