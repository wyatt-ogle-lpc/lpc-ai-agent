//app/javascript/llm_chat.js

import { marked } from "marked";
import { encodeWAV } from "wav_encoder";

// ========== Markdown Custom Renderer ==========
const customRenderer = new marked.Renderer();
customRenderer.strong = function (text) {
  if (typeof text === "object" && text !== null && "text" in text) {
    text = text.text;
  }
  return `<span class="markdown-bold">${escapeHtml(String(text))}</span>`;
};
marked.setOptions({ renderer: customRenderer, breaks: true });
marked.use({
  renderer: {
    heading(token) {
      const level = token.depth;
      const text = token.text;
      return `<h${level} class="markdown-header">${escapeHtml(text)}</h${level}>`;
    }
  }
});

// ========== Global UI/State ==========
let lastMessageWasVoice = false;

// ========== Turbo Init ==========
document.addEventListener("turbo:load", () => {
  // Chat logic
  const form = document.getElementById("chat-form");
  const chatLog = document.getElementById("llm-chat-log");
  if (!form || !chatLog) return;

  const textarea = form.querySelector("textarea");
  textarea.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    }
  });

  let isSending = false;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isSending) return;
    isSending = true;
    toggleSendButton(false);
    const prompt = textarea.value.trim();
    if (!prompt) {
      isSending = false;
      toggleSendButton(true);
      return;
    }
    const conversationId = form.dataset.conversationId;
    const userDiv = document.createElement("div");
    userDiv.className = "llm-message-row";
    userDiv.innerHTML = `<div class="llm-message llm-user">${escapeHtml(prompt)}</div>`;
    chatLog.appendChild(userDiv);

    const currentItem = document.querySelector(`.conversation-item[data-conversation-id="${conversationId}"]`);
    if (currentItem) {
      const currentLink = currentItem.querySelector(".conversation-title");
      if (currentLink && currentLink.innerText.trim().startsWith("New Chat")) {
        let agentName = document.querySelector(".agent-label")?.textContent.trim() || "Agent";
        agentName = agentName.replace("Switch Agent", "").trim();
        updateConversationTitle(`**${agentName}** - ${prompt}`, conversationId);
      }
    }

    const botDiv = document.createElement("div");
    botDiv.className = "llm-message-row";
    botDiv.innerHTML = `<div class="llm-message llm-bot" id="bot-response" data-animate><div class="llm-dots"><span></span><span></span><span></span></div></div>`;
    chatLog.appendChild(botDiv);
    scrollToBottom();
    textarea.value = "";
    const csrfToken = document.querySelector("meta[name='csrf-token']")?.content;
    try {
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
      animateBotResponse(content);

      if (data.updated_title) {
        updateConversationTitle(data.updated_title, conversationId);
      }
    } finally {
      isSending = false;
      toggleSendButton(true);
    }
  });

  // ===== Recording logic =====
  const recordButton = document.getElementById("start-recording");
  const micIcon = document.getElementById("mic-icon");
  let audioContext, mediaStream, processorNode;
  let audioData = [];
  if (recordButton) {
    recordButton.addEventListener("click", async (e) => {
      e.preventDefault();
      if (!audioContext) {
        audioContext = new AudioContext();
        await audioContext.audioWorklet.addModule("/audio/audio-processor.js");
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioContext.createMediaStreamSource(mediaStream);
        processorNode = new AudioWorkletNode(audioContext, "recorder-processor");
        processorNode.port.onmessage = (event) => {
          const chunk = event.data;
          if (
            chunk instanceof Float32Array &&
            chunk.length > 0 &&
            chunk.some((v) => v !== 0 && !isNaN(v))
          ) {
            audioData.push(chunk);
          }
        };
        source.connect(processorNode);
        processorNode.connect(audioContext.destination);
        micIcon.src = micIcon.dataset.recording;
        setTimeout(stopRecordingAndSend, 10000);
      } else {
        stopRecordingAndSend();
      }
    });
  }

  async function stopRecordingAndSend() {
    const languageSelect = document.getElementById("language-select");
    const selectedLang = languageSelect ? languageSelect.value : "en-US";
    if (!audioContext) return;
    mediaStream.getTracks().forEach(track => track.stop());
    micIcon.src = micIcon.dataset.mic;
    const totalSamples = audioData.reduce((sum, chunk) => sum + chunk.length, 0);
    const flat = new Float32Array(totalSamples);
    let offset = 0;
    for (const chunk of audioData) {
      flat.set(chunk, offset);
      offset += chunk.length;
    }
    const wavBlob = encodeWAV(flat, audioContext.sampleRate);
    const actualSampleRate = audioContext.sampleRate;
    audioContext = null;
    audioData = [];
    const formData = new FormData();
    formData.append("audio", wavBlob, "recording.wav");
    formData.append("sample_rate", actualSampleRate);
    formData.append("language_code", selectedLang);
    try {
      const res = await fetch("/transcribe", { method: "POST", body: formData });
      const data = await res.json();
      const transcript = data.transcript;
      if (transcript && transcript.trim() !== "" && !isSending) {
        textarea.value = transcript;
        lastMessageWasVoice = true;
        toggleSendButton(false);
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      } else if (!transcript || transcript.trim() === "") {
        alert("No transcript returned.");
      }
    } catch (err) {
      alert("Error sending audio.");
    }
  }

  // ===== Chat UI animation restore =====
  const lastBot = document.querySelector(".llm-message.llm-bot[data-animate]:not([id='bot-response'])");
  if (lastBot) {
    const content = lastBot.textContent.trim();
    animateBotResponse(content, lastBot);
  }
  scrollToBottom();

  // ====== SIDEBAR AND HEADER UI ======
  var toggleButton = document.getElementById('sidebar-toggle');
  const headerPlaceholder = document.getElementById('header-toggle-placeholder');
  const sidebarHeader = document.querySelector('.sidebar-header');
  function updateToggleIcon() {
    if (document.body.classList.contains('sidebar-hidden')) {
      toggleButton.textContent = '☰';
    } else {
      toggleButton.textContent = '×';
    }
  }
  function positionToggleButton() {
    if (document.body.classList.contains('sidebar-hidden')) {
      headerPlaceholder.appendChild(toggleButton);
    } else {
      sidebarHeader.appendChild(toggleButton);
    }
  }
  function autoHideSidebarOnResize() {
    if (window.innerWidth <= 768) {
      if (!document.body.classList.contains('sidebar-hidden')) {
        document.body.classList.add('sidebar-hidden');
      }
    } else {
      if (document.body.classList.contains('sidebar-hidden')) {
        document.body.classList.remove('sidebar-hidden');
      }
    }
    positionToggleButton();
    updateToggleIcon();
  }
  window.addEventListener('resize', autoHideSidebarOnResize);
  autoHideSidebarOnResize();
  if (toggleButton) {
    toggleButton.addEventListener('click', () => {
      document.body.classList.toggle('sidebar-hidden');
      positionToggleButton();
      updateToggleIcon();
    });
  }
  window.addEventListener('resize', () => {
    positionToggleButton();
    updateToggleIcon();
  });
  positionToggleButton();
  updateToggleIcon();

  // Header extra dropdown
  const headerToggleBtn = document.getElementById('header-extra-toggle');
  const headerExtra = document.getElementById('header-extra');
  if (headerToggleBtn && headerExtra) {
    headerToggleBtn.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        headerExtra.classList.toggle('visible');
      }
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        headerExtra.classList.remove('visible');
      }
    });
    document.addEventListener('click', (event) => {
      if (
        window.innerWidth <= 768 &&
        headerExtra.classList.contains('visible') &&
        !headerExtra.contains(event.target) &&
        event.target !== headerToggleBtn
      ) {
        headerExtra.classList.remove('visible');
      }
    });
    const headerExtraCloseBtn = document.getElementById('header-extra-close');
    if (headerExtraCloseBtn) {
      headerExtraCloseBtn.addEventListener('click', () => {
        headerExtra.classList.remove('visible');
      });
    }
  }

  // Language dropdown labels
  function updateLanguageLabels() {
    const select = document.getElementById('language-select');
    if (!select) return;
    const options = select.options;
    if (window.innerWidth <= 768) {
      if (options[0].text !== "En") options[0].text = "En";
      if (options[1].text !== "Es") options[1].text = "Es";
    } else {
      if (options[0].text !== "English") options[0].text = "English";
      if (options[1].text !== "Español") options[1].text = "Español";
    }
  }
  window.addEventListener('resize', updateLanguageLabels);
  document.addEventListener('DOMContentLoaded', updateLanguageLabels);
  updateLanguageLabels();
  
});

// ======= HELPERS =======
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
    if (lastMessageWasVoice) {
      speakText(raw);
      lastMessageWasVoice = false;
    }
    function typeChar() {
      const partial = raw.slice(0, charIndex);
      block.innerHTML = marked.parse(partial, { renderer: customRenderer });
      if (charIndex < raw.length) {
        charIndex++;
        scrollToBottom();
        setTimeout(typeChar, 10 + Math.random() * 15);
      } else {
        lastBot.removeAttribute("id");
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
  // Prefer scrolling the chat log container (the message list itself) if window width is under 768
  if (window.innerWidth < 768) {
    const chatLog = document.getElementById('llm-chat-log');
    if (chatLog && chatLog.scrollHeight > 0) {
      chatLog.scrollTo({ top: chatLog.scrollHeight, behavior: "smooth" });
      return;
    }
  }
  // Fallback: scroll the main chat area
  const mainContainer = document.querySelector('.llm-main');
  if (mainContainer && mainContainer.scrollHeight > 0) {
    mainContainer.scrollTo({ top: mainContainer.scrollHeight, behavior: "smooth" });
    return;
  }
  // Last resort: scroll the window
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}


function toggleSendButton(enabled) {
  const sendButton = document.querySelector(".llm-send");
  if (!sendButton) return;
  if (enabled) {
    sendButton.disabled = false;
    sendButton.style.opacity = "1";
    sendButton.style.pointerEvents = "auto";
  } else {
    sendButton.disabled = true;
    sendButton.style.opacity = "0.5";
    sendButton.style.pointerEvents = "none";
  }
}
// Remove markdown formatting from text before TTS
function stripMarkdown(text) {
  text = text.replace(/^#+\s?/gm, '');
  text = text.replace(/[*_~`]+/g, '');
  text = text.replace(/!\[.*?\]\(.*?\)/g, '');
  text = text.replace(/\[(.*?)\]\(.*?\)/g, '$1');
  text = text.replace(/^>\s?/gm, '');
  text = text.replace(/^-{3,}$/gm, '');
  text = text.replace(/^\s+/, '');
  return text.trim();
}
function speakText(text) {
  text = stripMarkdown(text);
  const langSelect = document.getElementById("language-select");
  const lang = langSelect ? langSelect.value : "en-US";
  fetch("/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language_code: lang })
  })
    .then(res => {
      if (!res.ok) throw new Error("TTS request failed");
      return res.blob();
    })
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
      audio.onended = () => URL.revokeObjectURL(url);
    })
    .catch(() => {});
}

function updateConversationTitle(newTitle, conversationId) {
  // Find active conversation link in sidebar
  const activeItem = document.querySelector(`.conversation-item[data-conversation-id="${conversationId}"]`);
  if (!activeItem) return;

  const activeLink = activeItem.querySelector(".conversation-title");
  // Update its HTML to match server formatting
  const safeTitle = newTitle.replace(/\*\*(.+?)\*\*/, '<span class="markdown-bold">$1</span>');
  activeLink.innerHTML = safeTitle;

  // Update tooltip text (strip "**Agent** - ")
  const tooltip = activeLink.closest(".conversation-item").querySelector(".tooltip");
  if (tooltip) {
    tooltip.textContent = newTitle.replace(/\*\*(.+?)\*\* - /, "");
  }
}

