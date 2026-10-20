# Subject data file format

Each subject is one file in this folder, e.g. `physics.js`, containing exactly one statement:

```js
SUBJECTS.push({
  id: "phy",                       // short id: phy | chem | bio | math
  t: ["भौतिकी", "Physics"],          // [hindi, english]
  ch: [
    { t: ["वैद्युत आवेश तथा क्षेत्र", "Electric Charges and Fields"],
      n: [                          // 6-8 key notes/formulas, each [hindi, english] or a plain string
        ["कूलॉम का नियम: F = kq₁q₂/r², k = 9×10⁹ N m² C⁻²", "Coulomb's law: F = kq₁q₂/r², k = 9×10⁹ N m² C⁻²"]
      ],
      q: [                          // 10 MCQs: [question, [4 options], correctIndex(0-3), explanation]
        [["आवेश का SI मात्रक है:", "SI unit of charge is:"], ["कूलॉम", "वोल्ट", "ऐम्पियर", "ओम"], 0,
         ["आवेश का मात्रक कूलॉम (C) है", "The unit of charge is the coulomb (C)"]]
      ] }
  ]
});
```

Rules:
- Any string may be plain (same in both languages, e.g. formulas, numbers) or `[hindi, english]`. Options may mix.
- Use the standard Hindi terminology from Bihar Board / NCERT Hindi-medium textbooks (e.g. विद्युत विभव, प्रतिरोधकता, अभिक्रिया की कोटि).
- Use Unicode for maths (², ³, ⁻¹, √, π, θ, λ, μ, ∫, →, ⇌, ×, ≤). No HTML, no LaTeX. Chemical formulas like H₂SO₄.
- Exactly one option correct, the other 3 plausible. Options are shuffled at runtime, so never write "all of the above"/"both a and b".
- Every fact and answer must be correct; double-check numeric answers in the explanation. Prefer standard textbook values.
- The file must be valid JavaScript (check with `node --check file.js`).
