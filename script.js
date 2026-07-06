const keyInput = document.getElementById("key-input");
const articleInput = document.getElementById("article-input");
const analyzeBtn = document.getElementById("analyze-btn");
const errorMsg = document.getElementById("error-msg");
const factsPanel = document.getElementById("facts-panel");
const factsText = document.getElementById("facts-text");
const framesGrid = document.getElementById("frames-grid");

const STORAGE_KEY = "framelines_api_key";

// Restore a previously saved key (kept only in this browser)
const savedKey = localStorage.getItem(STORAGE_KEY);
if (savedKey) keyInput.value = savedKey;

keyInput.addEventListener("change", () => {
  if (keyInput.value.trim()) {
    localStorage.setItem(STORAGE_KEY, keyInput.value.trim());
  }
});

const SYSTEM_PROMPT = `You help people see how the same set of facts gets framed differently across the ideological spectrum. You are not endorsing any viewpoint yourself — you are illustrating, as a media-literacy exercise, how communicators with different worldviews characteristically frame identical facts through word choice, emphasis, and what they foreground or omit.

Given an article or claim, do the following:
1. Extract the core verifiable facts in 1-3 neutral sentences, stripped of any spin.
2. Write four short framings (3-4 sentences each) of those SAME facts, one for each lens below. Do not invent new facts — only reframe the ones extracted. Each framing should read like something that lens's media would plausibly publish (headline-adjacent tone), not a description of the lens.

Lenses, in this exact order:
- progressive
- conservative
- centrist
- populist

Respond with ONLY valid JSON, no markdown fences, no preamble, in exactly this shape:
{"facts": "...", "frames": [{"label": "progressive", "text": "..."}, {"label": "conservative", "text": "..."}, {"label": "centrist", "text": "..."}, {"label": "populist", "text": "..."}]}`;

async function analyze() {
  const apiKey = keyInput.value.trim();
  const article = articleInput.value.trim();

  hideError();

  if (!apiKey) return showError("Enter your Anthropic API key first.");
  if (!article) return showError("Paste an article or claim to analyze.");

  setLoading(true);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: article }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => null);
      const detail = errBody?.error?.message || response.statusText;
      throw new Error(`API error (${response.status}): ${detail}`);
    }

    const data = await response.json();
    const rawText = data.content.map((block) => block.text || "").join("");
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    renderResults(parsed);
  } catch (err) {
    showError(err.message || "Something went wrong. Check your key and try again.");
  } finally {
    setLoading(false);
  }
}

function renderResults(parsed) {
  factsText.textContent = parsed.facts;
  factsPanel.classList.remove("hidden");

  framesGrid.innerHTML = "";
  parsed.frames.forEach((frame) => {
    const col = document.createElement("div");
    col.className = "frame-col";
    col.dataset.frame = frame.label;

    const kicker = document.createElement("span");
    kicker.className = "frame-kicker";
    kicker.textContent = frame.label;

    const text = document.createElement("p");
    text.className = "frame-text";
    text.textContent = frame.text;

    col.appendChild(kicker);
    col.appendChild(text);
    framesGrid.appendChild(col);
  });
}

function setLoading(isLoading) {
  analyzeBtn.disabled = isLoading;
  analyzeBtn.textContent = isLoading ? "Reading the room..." : "Show the frames";
}

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.classList.remove("hidden");
}

function hideError() {
  errorMsg.classList.add("hidden");
}

analyzeBtn.addEventListener("click", analyze);
