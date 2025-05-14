(function () {
  const cfg = window.ChatbotConfig || {};

  const toggleBtn = document.createElement("button");
  toggleBtn.className = "chatbot-toggle";
  toggleBtn.textContent = "💬";

  const container = document.createElement("div");
  container.className = "chatbot-container";

  container.innerHTML = `
    <div class="chatbot-header">Chatbot</div>
    <div class="chatbot-body" id="chatbot-body"></div>
    <div class="chatbot-input">
      <input type="text" id="chatbot-input" placeholder="Type a message..." />
      <button id="chatbot-send">Send</button>
    </div>
  `;

  document.body.appendChild(toggleBtn);
  document.body.appendChild(container);

  const body = container.querySelector("#chatbot-body");
  const input = container.querySelector("#chatbot-input");
  const sendBtn = container.querySelector("#chatbot-send");

  function appendMessage(text, from) {
    const div = document.createElement("div");
    div.className = `chatbot-message ${from}-message`;
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

    // Simulate backend by echoing the message
    const reply = `You said: "${msg}"`;
    setTimeout(() => {
      appendMessage(reply, "bot");
      saveMessage(reply, "bot");
    }, 500);
  }

  toggleBtn.onclick = () => {
    container.style.display = container.style.display === "flex" ? "none" : "flex";
  };

  sendBtn.onclick = sendMessage;
  input.onkeypress = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  // Init
  container.style.display = "none";
  container.style.flexDirection = "column";

  if (cfg.welcomeMessage) {
    appendMessage(cfg.welcomeMessage, "bot");
    saveMessage(cfg.welcomeMessage, "bot");
  }
  loadHistory();
})();
