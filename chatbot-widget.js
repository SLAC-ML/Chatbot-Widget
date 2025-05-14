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
    <div class="bg-blue-600 text-white text-lg font-semibold px-4 py-2 rounded-t-xl">
      🤖 Chatbot
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

  function appendMessage(text, from) {
    const div = document.createElement("div");
    div.className = `p-2 rounded-lg max-w-[80%] ${
      from === "user"
        ? "bg-blue-100 self-end ml-auto text-right"
        : "bg-gray-100 self-start mr-auto text-left"
    }`;
    div.textContent = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
  }

  function loadHistory() {
    const history = JSON.parse(localStorage.getItem("chatbot-history") || "[]");
    history.forEach(({ text, from }) => appendMessage(text, from));
  }

  function saveMessage(text, from) {
    const history = JSON.parse(localStorage.getItem("chatbot-history") || "[]");
    history.push({ text, from });
    localStorage.setItem("chatbot-history", JSON.stringify(history));
  }

  function sendMessage() {
    const msg = input.value.trim();
    if (!msg) return;
    appendMessage(msg, "user");
    saveMessage(msg, "user");
    input.value = "";

    const reply = `You said: "${msg}"`;
    setTimeout(() => {
      appendMessage(reply, "bot");
      saveMessage(reply, "bot");
    }, 500);
  }

  toggleBtn.onclick = () => {
    container.classList.toggle("hidden");
    container.classList.add("flex");
  };

  sendBtn.onclick = sendMessage;
  input.onkeypress = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  if (cfg.welcomeMessage) {
    appendMessage(cfg.welcomeMessage, "bot");
    saveMessage(cfg.welcomeMessage, "bot");
  }
  loadHistory();
})();
