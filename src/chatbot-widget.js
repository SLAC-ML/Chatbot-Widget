(function () {
  const defaultConfig = {
    welcomeMessage: "👋 Hello! Ask me anything about our research!",
    apiUrl: "http://localhost:8000/ask",
    downloadFilename: "chat-history.md",
    chatbotName: "🤖 Chatbot",
    resetWarning: "Start a new conversation? This will erase current messages.", // set to falsy value to disable reset warning
  };

  const cfg = { ...defaultConfig, ...(window.ChatbotConfig || {}) };

  function loadExternalScript(src, id) {
    return new Promise((resolve, reject) => {
      if (document.getElementById(id)) {
        resolve(); // Script already loaded
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.id = id;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function loadDependencies() {
    // Load MathJax
    MathJax = {
      tex: {
        inlineMath: [["$", "$"]],
        displayMath: [["$$", "$$"]],
      },
      chtml: {
        scale: 1,
      },
    };
    await loadExternalScript(
      "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js",
      "MathJax-script"
    );

    // Load Marked.js for Markdown rendering
    await loadExternalScript(
      "https://cdn.jsdelivr.net/npm/marked/marked.min.js",
      "marked-script"
    );
  }

  async function initChatbot() {
    await loadDependencies();

    const toggleBtn = document.createElement("button");
    toggleBtn.className =
      "fixed bottom-6 right-6 w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-xl hover:bg-white/30 transition duration-300 z-50";
    toggleBtn.style.backdropFilter = "saturate(180%) blur(10px)";
    toggleBtn.textContent = "💬";

    const container = document.createElement("div");
    container.style.display = "none";
    container.className = [
      "fixed inset-x-0 bottom-0", // stretch full width
      "max-h-[75vh] h-[60vh] md:h-[75vh]", // responsive height
      "bg-white/50 backdrop-blur-lg", // frosted glass
      "shadow-2xl",
      "transform translate-y-full", // start off-screen
      "transition-transform duration-300 ease-in-out",
      "flex flex-col z-40",
    ].join(" ");

    container.innerHTML = `
      <div class="border-b border-gray-200 text-gray-800 text-base font-semibold flex justify-between items-center">
        <span class="pl-4">${cfg.chatbotName}</span>
        <div class="flex gap-0">
          <button
            id="chatbot-download"
            class="text-base bg-white/20 backdrop-blur-md border border-white/30 text-gray-900 px-4 py-4 transition hover:bg-black/10"
          >
            Save Chat
          </button>
          <button
            id="chatbot-reset"
            class="text-base bg-white/20 backdrop-blur-md border border-white/30 text-gray-900 px-4 py-4 transition hover:bg-black/10"
          >
            New Chat
          </button>
        </div>
      </div>
      <div id="chatbot-body" class="container mx-auto px-8 flex-1 p-3 space-y-2 overflow-y-auto h-64 bg-white"></div>
      <div class="flex border-t border-gray-200">
        <textarea
          id="chatbot-input"
          placeholder="Type your message..."
          rows="1"
          class="flex-1 p-4 focus:outline-none resize-none rounded-bl-xl overflow-hidden leading-snug max-h-[8rem]"
        ></textarea>
        <button
          id="chatbot-send"
          class="px-4 py-2 bg-white/50 backdrop-blur-lg border border-white/30 text-gray-900 font-semibold hover:bg-black/10 transition rounded-br-xl"
        >
          Send
        </button>
      </div>
    `;

    document.body.appendChild(toggleBtn);
    document.body.appendChild(container);

    // --- hide icon when chat is open & vice versa ---
    toggleBtn.onclick = (e) => {
      e.stopPropagation(); // don’t immediately trigger the document click
      const isOpening = container.classList.contains("translate-y-full");
      container.classList.toggle("translate-y-full", !isOpening);
      container.classList.toggle("translate-y-0", isOpening);
      // hide the icon when open, show it when closed
      toggleBtn.style.display = isOpening ? "none" : "flex";
    };

    // prevent clicks INSIDE the chat from bubbling out and closing it
    container.addEventListener("click", (e) => e.stopPropagation());

    // clicking anywhere else closes the drawer and brings back the icon
    document.addEventListener("click", () => {
      if (!container.classList.contains("translate-y-full")) {
        container.classList.add("translate-y-full");
        container.classList.remove("translate-y-0");
        toggleBtn.style.display = "flex";
      }
    });

    // Prevent “scroll chaining” inside the chat body
    const chatBody = container.querySelector("#chatbot-body");
    chatBody.addEventListener(
      "wheel",
      (e) => {
        const { scrollTop, scrollHeight, clientHeight } = chatBody;
        const atTop = scrollTop === 0;
        const atBottom = scrollTop + clientHeight >= scrollHeight;
        const isScrollingUp = e.deltaY < 0;

        // If we’re at the top and scrolling up, or at the bottom and scrolling down…
        if ((atTop && isScrollingUp) || (atBottom && !isScrollingUp)) {
          e.preventDefault(); // stop the parent from scrolling
        }
      },
      { passive: false }
    );

    // Close on “Esc” key
    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        !container.classList.contains("translate-y-full")
      ) {
        // slide down
        container.classList.remove("translate-y-0");
        container.classList.add("translate-y-full");
        // show the icon
        toggleBtn.style.display = "flex";
      }
    });

    const body = container.querySelector("#chatbot-body");
    const input = container.querySelector("#chatbot-input");
    const sendBtn = container.querySelector("#chatbot-send");
    const resetBtn = container.querySelector("#chatbot-reset");
    const downloadBtn = container.querySelector("#chatbot-download");

    function appendMessage(text, from, timestamp = null) {
      const div = document.createElement("div");
      div.className = `py-2 px-4 rounded-lg prose prose-sm overflow-x-auto whitespace-pre-wrap break-words ${
        from === "user"
          ? "bg-gray-100 self-end ml-auto text-right max-w-[60%]"
          : "self-center mx-auto text-left max-w-[80%]"
      }`;

      const timeStr = timestamp
        ? new Date(timestamp).toLocaleString()
        : new Date().toLocaleString();

      const timeDiv = document.createElement("div");
      timeDiv.className = "text-xs text-gray-400 -mt-2";
      timeDiv.textContent = timeStr;

      // Render ALL messages as Markdown
      div.innerHTML = marked.parse(text);
      // grab every <pre> and give it its own padding + scroll
      div.querySelectorAll("pre").forEach((pre) => {
        pre.classList.add(
          "overflow-x-auto", // allow horizontal scroll
          "whitespace-pre", // don’t wrap
          "px-4", // padding-left/right
          "py-2", // padding-top/bottom (optional)
          "rounded-lg", // match your bubble’s border radius
          "bg-gray-50" // or whatever bg you prefer
        );
      });
      div.appendChild(timeDiv);

      body.appendChild(div);
      body.scrollTop = body.scrollHeight;

      // Trigger MathJax (chtml is safe here)
      MathJax.typesetPromise([div]).then(() => {
        div.querySelectorAll('mjx-math[display="true"]').forEach((math) => {
          // wrap it so you don't fight specificity
          const wrapper = document.createElement("div");
          wrapper.className = "overflow-x-auto whitespace-nowrap px-2 py-1";
          math.replaceWith(wrapper);
          wrapper.append(math);
        });
      });

      return div;
    }

    function getFullChatHistory() {
      return JSON.parse(localStorage.getItem("chatbot-history") || "[]");
    }

    function loadHistory() {
      const history = getFullChatHistory();
      history.forEach(({ text, from, timestamp }) =>
        appendMessage(text, from, timestamp)
      );
    }

    function saveMessage(text, from, timestamp = null) {
      const history = getFullChatHistory();
      history.push({
        text,
        from,
        timestamp: timestamp || new Date().toISOString(),
      });
      localStorage.setItem("chatbot-history", JSON.stringify(history));
    }

    function extractChatRecords() {
      const history = getFullChatHistory();
      return history.map(({ text, from }) => ({
        role: from === "user" ? "user" : "assistant",
        content: text,
      }));
    }

    async function sendMessage() {
      const msg = input.value.trim();
      if (!msg) return;
      appendMessage(msg, "user");
      saveMessage(msg, "user");
      input.value = "";

      // Show placeholder while waiting
      const placeholder = appendMessage("_Thinking..._", "bot");

      try {
        const response = await fetch(cfg.apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            query: msg,
            history: extractChatRecords(),
            embedding_model: "huggingface:thellert/physbert_cased",
            llm_model: "openai:gpt-4o-mini",
            max_documents: 5,
            score_threshold: 0,
            use_opensearch: false,
            prompt:
              "You are a helpful assistant. Output answers in Markdown. Use $ and $$ to surround mathematical formulas. Try to tie your answer to the provided list of sources. Say you don't know if you can't. Be as concise as possible.",
            files: [],
          }),
        });

        const data = await response.json();
        const markdownReply =
          data.answer || "_Sorry, I couldn't generate a response._";

        // Remove placeholder and replace it
        placeholder.remove();
        appendMessage(markdownReply, "bot");
        saveMessage(markdownReply, "bot");
      } catch (error) {
        console.error("Error from backend:", error);
        placeholder.remove();
        const failMsg = "_Failed to get a response from the server._";
        appendMessage(failMsg, "bot");
        saveMessage(failMsg, "bot");
      }
    }

    function downloadChatHistory() {
      const history = getFullChatHistory(); // full version with text, from, timestamp, etc.

      const markdown = history
        .map(({ from, text, timestamp }) => {
          const role = from === "user" ? "🧑 User" : "🤖 Assistant";
          const time = timestamp ? new Date(timestamp).toLocaleString() : "";
          return `### ${role}  \n*${time}*\n\n${text.trim()}\n`;
        })
        .join("\n---\n\n");

      const blob = new Blob([markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = cfg.downloadFilename;
      a.click();

      URL.revokeObjectURL(url);
    }

    sendBtn.onclick = sendMessage;

    input.addEventListener("input", () => {
      input.style.height = "auto"; // Reset first
      input.style.height = input.scrollHeight + "px"; // Grow to fit content
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault(); // Prevent newline
        sendMessage();
        input.style.height = "auto"; // Reset
      }
    });

    resetBtn.onclick = () => {
      if (!cfg.resetWarning || confirm(cfg.resetWarning)) {
        localStorage.removeItem("chatbot-history");
        body.innerHTML = "";
        if (cfg.welcomeMessage) {
          appendMessage(cfg.welcomeMessage, "bot");
          saveMessage(cfg.welcomeMessage, "bot");
        }
      }
    };

    downloadBtn.onclick = downloadChatHistory;

    // container.classList.add("flex");
    // container.classList.add("flex-col");
    // container.classList.add("hidden"); // Initially hidden

    const history = getFullChatHistory();
    if (history.length === 0 && cfg.welcomeMessage) {
      appendMessage(cfg.welcomeMessage, "bot");
      saveMessage(cfg.welcomeMessage, "bot");
    } else {
      loadHistory();
    }

    container.style.display = "";

    document.addEventListener("keydown", (e) => {
      const isMeta = e.metaKey; // ⌘ on Mac
      const isCtrl = e.ctrlKey; // Ctrl on Windows/Linux
      if ((isMeta || isCtrl) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        // if closed, open it; if open, close it
        const isClosed = container.classList.contains("translate-y-full");
        if (isClosed) {
          container.classList.remove("translate-y-full");
          container.classList.add("translate-y-0");
          toggleBtn.style.display = "none";
        } else {
          container.classList.remove("translate-y-0");
          container.classList.add("translate-y-full");
          toggleBtn.style.display = "flex";
        }
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initChatbot);
  } else {
    initChatbot();
  }
})();
