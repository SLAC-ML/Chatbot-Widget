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
      "fixed bottom-6 right-6 w-16 h-16 rounded-full bg-white/20 dark:bg-zinc-950/20 backdrop-blur-md flex items-center justify-center shadow-xl hover:bg-white/40 dark:hover:bg-zinc-950/40 transition duration-300 z-50";
    toggleBtn.style.backdropFilter = "saturate(180%) blur(10px)";
    toggleBtn.textContent = "💬";

    const container = document.createElement("div");
    container.style.display = "none";
    container.className = [
      "fixed inset-x-0 bottom-0", // stretch full width
      "max-h-[75vh] h-[60vh] md:h-[75vh]", // responsive height
      "bg-gray-100/50 backdrop-blur-lg", // frosted glass
      "dark:bg-zinc-950/50", // dark mode support
      "shadow-2xl",
      "transform translate-y-full", // start off-screen
      "transition-transform duration-300 ease-in-out",
      "flex flex-col z-40",
    ].join(" ");

    container.innerHTML = `
      <div class="relative flex-1 overflow-hidden">
        <div id="chatbot-body" class="absolute inset-0 px-[clamp(1rem,calc((100vw-1024px)/2),100rem)] py-16 space-y-2 overflow-y-auto bg-white dark:bg-zinc-950 text-black dark:text-gray-100"></div>
        <div id="chatbot-header" class="absolute top-0 left-0 right-0 h-14 bg-white/20 backdrop-blur-md border-b border-gray-200 dark:border-zinc-600 text-gray-800 dark:text-gray-100 text-base font-semibold flex justify-between items-center">
          <span class="pl-4">${cfg.chatbotName}</span>
          <div class="flex gap-0">
            <button
              id="chatbot-download"
              class="text-base text-gray-900 dark:text-gray-100 px-4 py-4 transition hover:bg-black/10 dark:hover:bg-white/10"
            >
              Save Chat
            </button>
            <button
              id="chatbot-reset"
              class="text-base text-gray-900 dark:text-gray-100 px-4 py-4 transition hover:bg-black/10 dark:hover:bg-white/10"
            >
              New Chat
            </button>
            <button
              id="chatbot-use-rag"
              class="text-base text-gray-900 dark:text-gray-100 px-4 py-4 transition hover:bg-black/10 dark:hover:bg-white/10 flex items-center gap-2"
            >
              <input type="checkbox" id="use-rag-checkbox" class="mr-2" />
              Use RAG
            </button>
            <button
              id="chatbot-theme-toggle"
              aria-label="Toggle light/dark theme"
              class="text-base text-gray-900 dark:text-gray-100 px-4 py-4 transition hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center"
            >
              <!-- We'll swap this icon in JS -->
              <svg id="theme-icon" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <!-- placeholder: sun by default -->
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414M17.364 17.364l-1.414-1.414M7.05 7.05L5.636 5.636" />
              </svg>
            </button>
          </div>
        </div>
        <div id="chatbot-footer" class="absolute bottom-0 left-0 right-0 flex bg-white/20 backdrop-blur-md border-t border-gray-200 dark:border-zinc-600">
          <textarea
            id="chatbot-input"
            placeholder="Type your message..."
            rows="1"
            class="flex-1 p-4 focus:outline-none resize-none rounded-bl-xl overflow-hidden text-gray-900 dark:text-gray-100 leading-snug max-h-[8rem]"
          ></textarea>
          <button
            id="chatbot-send"
            class="px-4 py-2 text-gray-900 dark:text-gray-100 font-semibold hover:bg-black/10 dark:hover:bg-white/10 transition rounded-br-xl"
          >
            Send
          </button>
        </div>
      </div>
    `;

    // Add event listener to toggle checkbox state when button is clicked
    const useRagButton = container.querySelector("#chatbot-use-rag");
    const useRagCheckbox = container.querySelector("#use-rag-checkbox");

    useRagButton.addEventListener("click", (e) => {
      e.preventDefault(); // Prevent default button behavior
      useRagCheckbox.checked = !useRagCheckbox.checked; // Toggle checkbox state
    });

    document.body.appendChild(toggleBtn);
    document.body.appendChild(container);

    //  ——— Theme management ———
    const themeToggleBtn = container.querySelector("#chatbot-theme-toggle");
    const themeIcon = themeToggleBtn.querySelector("#theme-icon");

    // 1) Load saved or system theme
    let theme = localStorage.getItem("chatbot-theme");
    if (!theme) {
      theme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }

    // 2) Apply it to <html> so Tailwind dark: classes take effect
    document.documentElement.classList.toggle("dark", theme === "dark");
    // 3) Set the correct icon (sun for light, moon for dark)
    function updateIcon() {
      if (theme === "dark") {
        themeIcon.innerHTML = `
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
        `; // moon
      } else {
        themeIcon.innerHTML = `
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414
                  M17.364 17.364l-1.414-1.414M7.05 7.05L5.636 5.636" />
        `; // sun
      }
    }
    updateIcon();

    // 4) Toggle handler
    themeToggleBtn.addEventListener("click", () => {
      theme = theme === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", theme === "dark");
      localStorage.setItem("chatbot-theme", theme);
      updateIcon();
    });

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

    function appendMessage(text, from, timestamp = null, docs = []) {
      const div = document.createElement("div");
      div.className = `py-2 px-4 rounded-lg prose prose-sm overflow-x-auto whitespace-pre-wrap break-words ${
        from === "user"
          ? "bg-gray-100 dark:bg-zinc-800 self-end ml-auto mr-4 text-right max-w-[60%]"
          : "self-center mx-auto text-left w-full"
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

      if (from === "bot" && docs.length) {
        // 1) Wrapper for the whole panel
        const wrapper = document.createElement("div");
        wrapper.className = "mt-4 bg-gray-50 dark:bg-zinc-900 rounded-lg";

        // 2) Header button (click to toggle)
        const header = document.createElement("button");
        header.type = "button";
        header.className =
          "w-full flex items-center gap-2 p-4 text-sm font-medium text-gray-800 dark:text-gray-100 cursor-pointer";
        header.innerHTML = `
          <svg
            class="w-5 h-5 text-blue-500 transition-transform"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 5l7 7-7 7" />
          </svg>
          <span>${docs.length} source${docs.length > 1 ? "s" : ""}</span>
        `;
        wrapper.appendChild(header);

        // 3) Content container, hidden by default
        const content = document.createElement("div");
        content.className = "overflow-hidden";
        content.style.height = "0px";
        content.style.opacity = "0";
        content.style.transition = "height 0.3s ease, opacity 0.2s ease";
        content.style.willChange = "height, opacity";

        // 4) Fill in each document snippet
        docs.forEach((d) => {
          const p = document.createElement("div");
          p.className =
            "m-2 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-zinc-950 rounded-md shadow-xs dark:shadow-zinc-800";
          p.innerHTML = `
            <strong>${d.id}</strong> (score: ${d.score.toFixed(2)})<br>
            ${d.snippet.replace(/\n/g, "<br>")}…
          `;
          content.appendChild(p);
        });
        wrapper.appendChild(content);

        // 5) Toggle logic
        const arrow = header.querySelector("svg");
        header.addEventListener("click", () => {
          const isOpen = header.classList.toggle("open");
          // measure full height
          const fullH = content.scrollHeight + "px";

          if (isOpen) {
            // opening: from 0 to fullH
            content.style.height = "0px";
            content.style.opacity = "0";
            // force reflow then animate
            requestAnimationFrame(() => {
              content.style.height = fullH;
              content.style.opacity = "1";
              arrow.style.transform = "rotate(90deg)";
            });
          } else {
            // closing: from current to 0
            content.style.height = fullH;
            content.style.opacity = "1";
            requestAnimationFrame(() => {
              content.style.height = "0px";
              content.style.opacity = "0";
              arrow.style.transform = "";
            });
          }
        });

        // 6) After opening, clear fixed height so it can grow if needed
        content.addEventListener("transitionend", (e) => {
          if (
            e.propertyName === "height" &&
            header.classList.contains("open")
          ) {
            content.style.height = "auto";
          }
        });

        div.appendChild(wrapper);
      }

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
      history.forEach(({ text, from, timestamp, docs }) =>
        appendMessage(text, from, timestamp, docs || [])
      );
    }

    function saveMessage(text, from, timestamp = null, docs = []) {
      const history = getFullChatHistory();
      history.push({
        text,
        from,
        timestamp: timestamp || new Date().toISOString(),
        docs,
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
            use_rag: useRagCheckbox.checked,
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
        const docs = data.documents || [];

        // Remove placeholder and replace it
        placeholder.remove();
        appendMessage(markdownReply, "bot", null, docs);
        saveMessage(markdownReply, "bot", null, docs);
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
