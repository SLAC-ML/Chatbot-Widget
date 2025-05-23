(function () {
  const cfg = window.ChatbotConfig || {};

  const toggleBtn = document.createElement("button");
  toggleBtn.className =
    "fixed bottom-4 right-4 w-14 h-14 rounded-full bg-blue-600 text-white text-2xl flex items-center justify-center shadow-lg hover:bg-blue-700 z-50";
  toggleBtn.textContent = "💬";

  const container = document.createElement("div");
  container.className =
    "fixed bottom-20 right-4 w-80 max-h-[75vh] bg-white rounded-xl shadow-2xl flex-col hidden z-40";

  container.innerHTML = `
    <div class="bg-blue-600 text-white text-lg font-semibold px-4 py-2 rounded-t-xl flex justify-between items-center">
      <span>🤖 Chatbot</span>
      <button id="chatbot-reset" class="text-sm bg-blue-500 hover:bg-blue-700 px-2 py-1 rounded ml-2">
        New Chat
      </button>
    </div>
    <div id="chatbot-body" class="flex-1 p-3 space-y-2 overflow-y-auto h-64 text-sm"></div>
    <div class="flex border-t border-gray-300">
      <input
        id="chatbot-input"
        type="text"
        placeholder="Type your message..."
        class="flex-1 px-3 py-2 focus:outline-none rounded-bl-xl"
      />
      <button
        id="chatbot-send"
        class="px-4 py-2 bg-blue-600 text-white font-semibold hover:bg-blue-700 rounded-br-xl"
      >
        Send
      </button>
    </div>
  `;

  document.body.appendChild(toggleBtn);
  document.body.appendChild(container);

  const body = container.querySelector("#chatbot-body");
  const input = container.querySelector("#chatbot-input");
  const sendBtn = container.querySelector("#chatbot-send");
  const resetBtn = container.querySelector("#chatbot-reset");

  function appendMessage(text, from, isMarkdown = false) {
    const div = document.createElement("div");
    div.className = `p-2 rounded-lg max-w-[80%] whitespace-pre-wrap break-words ${
      from === "user"
        ? "bg-blue-100 self-end ml-auto text-right"
        : "bg-gray-100 self-start mr-auto text-left"
    }`;

    if (from === "bot" && isMarkdown) {
      div.innerHTML = marked.parse(text);
      div.classList.add("prose", "max-w-full", "text-sm");
    } else {
      div.textContent = text;
    }

    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    return div; // ✅ so we can later remove or update it
  }

  function loadHistory() {
    const history = JSON.parse(localStorage.getItem("chatbot-history") || "[]");
    history.forEach(({ text, from, isMarkdown }) =>
      appendMessage(text, from, isMarkdown)
    );
  }

  function saveMessage(text, from, isMarkdown = false) {
    const history = JSON.parse(localStorage.getItem("chatbot-history") || "[]");
    history.push({ text, from, isMarkdown });
    localStorage.setItem("chatbot-history", JSON.stringify(history));
  }

  function getChatHistory() {
    const history = JSON.parse(localStorage.getItem("chatbot-history") || "[]");
    return history.map(({ text, from }) => ({
      role: from === "user" ? "user" : "assistant",
      content: text
    }));
  }

  async function sendMessage() {
    const msg = input.value.trim();
    if (!msg) return;
    appendMessage(msg, "user");
    saveMessage(msg, "user", false);
    input.value = "";

    // Show placeholder while waiting
    const placeholder = appendMessage("_Thinking..._", "bot", true);

    try {
      const response = await fetch("http://localhost:8000/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          query: msg,
          history: getChatHistory(),
          embedding_model: "huggingface:thellert/physbert_cased",
          llm_model: "ollama:llama3.1:latest",
          max_documents: 5,
          score_threshold: 0,
          use_opensearch: false,
          prompt: "You are a helpful assistant. Output answers in Markdown. Use $ and $$ to surround mathematical formulas. Try to tie your answer to the provided list of sources. Say you don't know if you can't. Be as concise as possible.",
          files: []
        })
      });

      const data = await response.json();
      const markdownReply = data.answer || "_Sorry, I couldn't generate a response._";

      // Remove placeholder and replace it
      placeholder.remove();
      appendMessage(markdownReply, "bot", true);
      saveMessage(markdownReply, "bot", true);

    } catch (error) {
      console.error("Error from backend:", error);
      placeholder.remove();
      const failMsg = "_Failed to get a response from the server._";
      appendMessage(failMsg, "bot", true);
      saveMessage(failMsg, "bot", true);
    }
  }

  toggleBtn.onclick = () => {
    container.classList.toggle("hidden");
    container.classList.add("flex");
  };

  sendBtn.onclick = sendMessage;
  input.onkeypress = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  resetBtn.onclick = () => {
    if (confirm("Start a new conversation? This will erase current messages.")) {
      localStorage.removeItem("chatbot-history");
      body.innerHTML = "";
      if (cfg.welcomeMessage) {
        appendMessage(cfg.welcomeMessage, "bot", false);
        saveMessage(cfg.welcomeMessage, "bot", false);
      }
    }
  };

  // Init
  container.classList.add("flex");
  container.classList.add("flex-col");
  container.classList.add("hidden"); // Initially hidden

  const history = JSON.parse(localStorage.getItem("chatbot-history") || "[]");
  if (history.length === 0 && cfg.welcomeMessage) {
    appendMessage(cfg.welcomeMessage, "bot", false);
    saveMessage(cfg.welcomeMessage, "bot", false);
  } else {
    loadHistory();
  }
})();
