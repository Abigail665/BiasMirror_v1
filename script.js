const articleInput = document.getElementById("article-input");
const generateBtn = document.getElementById("generate-btn");

const promptPanel = document.getElementById("prompt-panel");
const promptOutput = document.getElementById("prompt-output");
const copyPromptBtn = document.getElementById("copy-prompt-btn");
const copyConfirm = document.getElementById("copy-confirm");

const responsePanel = document.getElementById("response-panel");
const responseInput = document.getElementById("response-input");
const renderBtn = document.getElementById("render-btn");
const errorMsg = document.getElementById("error-msg");

const factsPanel = document.getElementById("facts-panel");
const factsText = document.getElementById("facts-text");
const framesGrid = document.getElementById("frames-grid");

function buildPrompt(article) {
  return `You help people see how the same set of facts gets framed differently across the ideological spectrum. You are not endorsing any viewpoint yourself — you are illustrating, as a media-literacy exercise, how communicators with different worldviews characteristically frame identical facts through word choice, emphasis, and what they foreground or omit.

Given the article or claim below, do the following:
1. Extract the core verifiable facts in 1-3 neutral sentences, stripped of any spin.
2. Write four short framings (3-4 sentences each) of those SAME facts, one for each lens below. Do not invent new facts — only reframe the ones extracted. Each framing should read like something that lens's media would plausibly publish (headline-adjacent tone), not a description of the lens.

Lenses, in this exact order: progressive, conservative, centrist, populist.

Respond with ONLY valid JSON, no markdown fences, no preamble, in exactly this shape:
{"facts": "...", "frames": [{"label": "progressive", "text": "..."}, {"label": "conservative", "text": "..."}, {"label": "centrist", "text": "..."}, {"label": "populist", "text": "..."}]}

Article or claim:
"""
${article}
"""`;
}

generateBtn.addEventListener("click", () => {
  const article = articleInput.value.trim();
  hideError();

  if (!article) {
    articleInput.focus();
    return;
  }

  promptOutput.value = buildPrompt(article);
  promptPanel.classList.remove("hidden");
  responsePanel.classList.remove("hidden");
  responseInput.value = "";
  factsPanel.classList.add("hidden");
  framesGrid.innerHTML = "";

  promptPanel.scrollIntoView({ behavior: "smooth", block: "start" });
});

copyPromptBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(promptOutput.value);
  } catch {
    // Fallback for browsers without clipboard API access
    promptOutput.select();
    document.execCommand("copy");
  }
  copyConfirm.classList.remove("hidden");
  setTimeout(() => copyConfirm.classList.add("hidden"), 1800);
});

renderBtn.addEventListener("click", () => {
  hideError();
  const raw = responseInput.value.trim();

  if (!raw) return showError("Paste the AI's response first.");

  const parsed = extractJson(raw);
  if (!parsed) {
    return showError(
      "Couldn't find valid JSON in that response. Make sure you pasted the full reply, with nothing added before or after it."
    );
  }
  if (!parsed.facts || !Array.isArray(parsed.frames)) {
    return showError("That JSON doesn't match the expected shape (missing 'facts' or 'frames').");
  }

  renderResults(parsed);
  factsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
});

function extractJson(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to salvage JSON if there's stray text around it
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
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

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.classList.remove("hidden");
}

function hideError() {
  errorMsg.classList.add("hidden");
}
