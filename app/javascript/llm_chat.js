// app/javascript/llm_chat.js
import { marked } from "marked";

const customRenderer = new marked.Renderer();

customRenderer.strong = function (text) {
  // If `text` is a token object, extract `text.text`

  if (typeof text === "object" && text !== null && "text" in text) {
    text = text.text;
  }
  console.log("🔥 STRONG:", text);
  return `<span class="markdown-bold">${escapeHtml(String(text))}</span>`;
};


marked.setOptions({
  renderer: customRenderer,
  breaks: true // makes single line breaks render as <br>
});

marked.use({
  renderer: {
    heading(token) {
      const level = token.depth;
      const text = token.text;
      return `<h${level} class="markdown-header">${escapeHtml(text)}</h${level}>`;
    }
  }
});

console.log("✅ llm_chat.js loaded");

document.addEventListener("turbo:load", () => {
  console.log("🔥 DOMContentLoaded fired");

  const form = document.getElementById("chat-form");
  const chatLog = document.getElementById("llm-chat-log");

  if (!form || !chatLog) {
    console.warn("⚠️ Missing form or chat log element");
    return;
  }

  const textarea = form.querySelector("textarea");

  textarea.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const prompt = textarea.value.trim();
    if (!prompt) return;

    const conversationId = form.dataset.conversationId;

    const userDiv = document.createElement("div");
    userDiv.className = "llm-message-row";
    userDiv.innerHTML = `<div class="llm-message llm-user">${escapeHtml(prompt)}</div>`;
    chatLog.appendChild(userDiv);

    const botDiv = document.createElement("div");
    botDiv.className = "llm-message-row";
    botDiv.innerHTML = `
      <div class="llm-message llm-bot" id="bot-response" data-animate>
        <div class="llm-dots"><span></span><span></span><span></span></div>
      </div>
    `;
    chatLog.appendChild(botDiv);
    scrollToBottom();
    textarea.value = "";

    const csrfToken = document.querySelector("meta[name='csrf-token']")?.content;

    const response = await fetch(`/ask/${conversationId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-CSRF-Token": csrfToken
      },
      body: JSON.stringify({ prompt })
    });

    const data = await response.json();
    const content = data.reply?.trim() || "";
    console.log("Received bot response:", content);

    animateBotResponse(content);
  });

  const lastBot = document.querySelector(".llm-message.llm-bot[data-animate]:not([id='bot-response'])");
  if (lastBot) {
    const content = lastBot.textContent.trim();
    animateBotResponse(content, lastBot);
  }
  scrollToBottom();
});


function animateBotResponse(content, el = null) {
  const lastBot = el || document.getElementById("bot-response");
  if (!lastBot || !content) return;

  lastBot.innerHTML = "";

  const dots = document.createElement("span");
  dots.className = "llm-dots";
  dots.innerHTML = "<span></span><span></span><span></span>";
  lastBot.appendChild(dots);

  setTimeout(() => {
    lastBot.removeChild(dots);

    const raw = content.trim();
    const block = document.createElement("div");
    block.dataset.index = 0;
    block.innerHTML = "";
    lastBot.appendChild(block);

    let charIndex = 0;

    function typeChar() {
      const partial = raw.slice(0, charIndex);
      block.innerHTML = marked.parse(partial, { renderer: customRenderer });

      if (charIndex < raw.length) {
        charIndex++;
        scrollToBottom();
        setTimeout(typeChar, 15 + Math.random() * 20);
      } else {
        lastBot.removeAttribute("id"); // prevent reuse or overwriting
        requestAnimationFrame(() => scrollToBottom());
      }
    }

    typeChar();
  }, 800);
}



function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function scrollToBottom() {
  const container = document.querySelector(".llm-main");
  if (container) {
    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth"
    });
  }
}

