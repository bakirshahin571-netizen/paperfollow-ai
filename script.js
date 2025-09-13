// === ترجمة متعددة اللغات ===
const translations = {
  "search-btn": { en: "Search with AI", ar: "ابحث بالذكاء الاصطناعي" },
  "broad-field": { en: "Broad Field", ar: "التخصص العام" },
  "narrow-field": { en: "Narrow Field", ar: "التخصص الدقيق" },
  "search-query": { en: "What are you looking for?", ar: "ما الذي تبحث عنه؟" },
  "no-results": { en: "No papers found. Try different keywords.", ar: "لم يتم العثور على أوراق. جرب كلمات أخرى." }
};

function translatePage(lang) {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (translations[key] && translations[key][lang]) {
      el.textContent = translations[key][lang];
    }
  });
}

document.getElementById("language-select").addEventListener("change", function() {
  translatePage(this.value);
});
translatePage("ar"); // ابدأ بالعربية

// === شجرة التخصصات ===
const narrowFields = {
  "Computer Science": ["تعلم الآلة", "معالجة اللغة الطبيعية", "رؤية الحاسوب", "الذكاء الاصطناعي", "أمن المعلومات"],
  "Medicine": ["تشخيص السرطان", "العلاج الجيني", "الطب الشخصي", "الذكاء الاصطناعي في الطب", "الروبوتات الجراحية"],
  "Physics": ["فيزياء الكم", "النسبية العامة", "فيزياء الجسيمات", "الطاقة المتجددة", "المواد المتقدمة"]
};

document.getElementById("broad-field").addEventListener("change", function() {
  const broad = this.value;
  const narrowSelect = document.getElementById("narrow-field");
  narrowSelect.innerHTML = '<option value="">اختر تخصصًا دقيقًا</option>';
  narrowSelect.disabled = !broad;

  if (broad && narrowFields[broad]) {
    narrowFields[broad].forEach(item => {
      const option = document.createElement("option");
      option.value = item;
      option.textContent = item;
      narrowSelect.appendChild(option);
    });
  }
});

// === البحث الذكي الحقيقي باستخدام Hugging Face ===
document.getElementById("search-btn").addEventListener("click", async () => {
  const query = document.getElementById("search-query").value.trim();
  if (!query) { alert("من فضلك أدخل كلمة بحث!"); return; }

  document.getElementById("results-container").classList.add("hidden");
  document.body.style.cursor = "wait";

  try {
    const papers = await fetchArxivPapers(query);
    const rankedPapers = await rankBySemanticSimilarity(papers, query);
    displayResults(rankedPapers, query);
  } catch (error) {
    console.error("خطأ:", error);
    alert("حدث خطأ أثناء البحث. تأكد من الاتصال بالإنترنت.");
  } finally {
    document.body.style.cursor = "default";
  }
});

async function fetchArxivPapers(query) {
  const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=10`;
  const response = await fetch(url);
  const text = await response.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, "text/xml");

  const papers = [];
  xmlDoc.querySelectorAll("entry").forEach(entry => {
    const title = entry.querySelector("title")?.textContent || "بدون عنوان";
    const summary = entry.querySelector("summary")?.textContent || "";
    const authors = Array.from(entry.querySelectorAll("author name")).map(n => n.textContent).join(", ");
    const link = entry.querySelector("id")?.textContent || "#";
    const published = entry.querySelector("published")?.textContent || "";

    papers.push({ title, summary, authors, link, published });
  });

  return papers;
}

// ✅ التحليل السياقي الحقيقي باستخدام Hugging Face (مجانًا!)
async function rankBySemanticSimilarity(papers, query) {
  const API_URL = "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2";
  const API_KEY = "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"; // ← ستحصل عليه لاحقًا

  const payload = {
    inputs: {
      source_sentence: query,
      sentences: papers.map(p => p.summary)
    }
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    return papers.map((paper, i) => ({
      ...paper,
      similarity: data[i] || 0
    })).sort((a, b) => b.similarity - a.similarity);

  } catch (error) {
    console.warn("فشل تحليل الذكاء الاصطناعي، نعود للنموذج البسيط...");
    return rankBySimpleKeywordMatch(papers, query); // احتياطي
  }
}

function rankBySimpleKeywordMatch(papers, query) {
  const queryWords = query.toLowerCase().split(/\s+/);
  return papers.map(paper => {
    const summaryWords = paper.summary.toLowerCase().split(/\s+/);
    const matchCount = queryWords.filter(word => summaryWords.includes(word)).length;
    const similarityScore = matchCount / queryWords.length;
    return { ...paper, similarity: similarityScore };
  }).sort((a, b) => b.similarity - a.similarity);
}

function displayResults(papers, query) {
  const container = document.getElementById("results-list");
  container.innerHTML = "";

  if (papers.length === 0) {
    container.innerHTML = `<p class='text-center text-gray-500'>${translations["no-results"].ar}</p>`;
    document.getElementById("results-container").classList.remove("hidden");
    return;
  }

  papers.forEach(paper => {
    const resultDiv = document.createElement("div");
    resultDiv.className = "result-item";
    resultDiv.innerHTML = `
      <h3 class="result-title">${paper.title}</h3>
      <p class="result-authors">بقلم: ${paper.authors}</p>
      <p class="result-summary">${paper.summary.substring(0, 200)}${paper.summary.length > 200 ? '...' : ''}</p>
      <div class="result-meta">
        <span>(${new Date(paper.published).getFullYear()})</span>
        <a href="${paper.link}" target="_blank" rel="noopener">اقرأ الكامل</a>
      </div>
      <div class="text-xs text-green-600 mt-2">• تشابه سياقي: ${(paper.similarity * 100).toFixed(1)}%</div>
    `;
    container.appendChild(resultDiv);
  });

  document.getElementById("results-container").classList.remove("hidden");
}
