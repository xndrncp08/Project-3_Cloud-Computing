// src/components/RecipeTable.jsx
import styles from "./RecipeTable.module.css";

// Highlights all occurrences of `keyword` inside `text`
function Highlight({ text, keyword }) {
  if (!keyword || !text) return <>{text}</>;
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = String(text).split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className={styles.highlight}>{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

const DIET_COLORS = {
  Vegan:         { bg: "#0d2b1e", color: "#3ecf8e", border: "rgba(62,207,142,0.25)" },
  Vegetarian:    { bg: "#1a2b0d", color: "#a3e635", border: "rgba(163,230,53,0.25)" },
  Keto:          { bg: "#1e1a0d", color: "#f5a623", border: "rgba(245,166,35,0.25)" },
  Paleo:         { bg: "#2b1a0d", color: "#fb7185", border: "rgba(251,113,133,0.25)" },
  Mediterranean: { bg: "#0d1a2b", color: "#60a5fa", border: "rgba(96,165,250,0.25)" },
  "Gluten-Free": { bg: "#1a0d2b", color: "#a78bfa", border: "rgba(167,139,250,0.25)" },
  "Dairy-Free":  { bg: "#2b0d1a", color: "#f472b6", border: "rgba(244,114,182,0.25)" },
  Omnivore:      { bg: "#1a1a1a", color: "#94a3b8", border: "rgba(148,163,184,0.25)" },
};

function DietBadge({ type }) {
  const c = DIET_COLORS[type] || { bg: "#1a1d28", color: "#8b90a8", border: "rgba(139,144,168,0.25)" };
  return (
    <span
      className={styles.badge}
      style={{ background: c.bg, color: c.color, borderColor: c.border }}
    >
      {type}
    </span>
  );
}

function MacroBar({ protein, carbs, fat }) {
  const total = protein + carbs + fat || 1;
  return (
    <div className={styles.macroBar} title={`P: ${protein}g  C: ${carbs}g  F: ${fat}g`}>
      <div className={styles.macroSegP} style={{ width: `${(protein / total) * 100}%` }} />
      <div className={styles.macroSegC} style={{ width: `${(carbs / total) * 100}%` }} />
      <div className={styles.macroSegF} style={{ width: `${(fat / total) * 100}%` }} />
    </div>
  );
}

export default function RecipeTable({ recipes, loading, keyword }) {
  if (loading) {
    return (
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <TableHead />
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className={styles.skeletonRow}>
                {[60, 80, 50, 40, 70, 60].map((w, j) => (
                  <td key={j}>
                    <div className={styles.skeletonCell} style={{ width: `${w}%` }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!recipes || recipes.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>⊘</span>
        <p>No recipes found{keyword ? ` for "${keyword}"` : ""}.</p>
        <p className={styles.emptySub}>Try a different keyword or diet type.</p>
      </div>
    );
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <TableHead />
        <tbody>
          {recipes.map((r) => (
            <tr key={r.id} className={styles.row}>
              <td className={styles.nameCell}>
                <Highlight text={r.name} keyword={keyword} />
              </td>
              <td>
                <DietBadge type={r.dietType} />
              </td>
              <td className={styles.cuisineCell}>
                <Highlight text={r.cuisine} keyword={keyword} />
              </td>
              <td className={styles.numCell}>{r.calories}</td>
              <td>
                <MacroBar protein={r.protein} carbs={r.carbs} fat={r.fat} />
                <div className={styles.macroNums}>
                  <span style={{ color: "#5b6ef5" }}>P {r.protein}g</span>
                  <span style={{ color: "#3ecf8e" }}>C {r.carbs}g</span>
                  <span style={{ color: "#f5a623" }}>F {r.fat}g</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableHead() {
  return (
    <thead>
      <tr>
        <th className={styles.th}>Recipe</th>
        <th className={styles.th}>Diet</th>
        <th className={styles.th}>Cuisine</th>
        <th className={styles.th}>Calories</th>
        <th className={styles.th}>Macros</th>
      </tr>
    </thead>
  );
}
