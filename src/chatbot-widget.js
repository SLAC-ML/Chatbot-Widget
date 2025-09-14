(function () {
  const defaultConfig = {
    welcomeMessage: "👋 Hello! Ask me anything about our research!",
    apiUrl: "http://localhost:8000/ask/stream",
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

    // Add custom CSS for markdown content
    const style = document.createElement("style");
    style.textContent = `
      .markdown-content h1, .markdown-content h2, .markdown-content h3,
      .markdown-content h4, .markdown-content h5, .markdown-content h6 {
        font-weight: bold;
        margin-top: 1.5em;
        margin-bottom: 0.5em;
      }
      .markdown-content h1 { font-size: 1.5em; }
      .markdown-content h2 { font-size: 1.3em; }
      .markdown-content h3 { font-size: 1.1em; }
      .markdown-content p {
        margin-bottom: 1em;
      }
      .markdown-content ul, .markdown-content ol {
        margin: 1em 0;
        padding-left: 1.5em;
      }
      .markdown-content ul {
        list-style-type: disc;
      }
      .markdown-content ol {
        list-style-type: decimal;
      }
      .markdown-content ul ul {
        list-style-type: circle;
      }
      .markdown-content ul ul ul {
        list-style-type: square;
      }
      .markdown-content li {
        margin: 0.25em 0;
        display: list-item;
      }
      .markdown-content table {
        border-collapse: collapse;
        width: 100%;
        margin: 1em 0;
      }
      .markdown-content th, .markdown-content td {
        border: 1px solid #e5e7eb;
        padding: 0.5em;
        text-align: left;
      }
      .markdown-content th {
        background-color: #f9fafb;
        font-weight: bold;
      }
      .markdown-content code {
        background-color: #f1f5f9;
        padding: 0.125em 0.25em;
        border-radius: 0.25em;
        font-family: monospace;
        font-size: 1em;
      }
      .markdown-content pre {
        background-color: #f8fafc;
        padding: 1em;
        border-radius: 0.5em;
        overflow-x: auto;
        margin: 1em 0;
        font-size: 1em;
      }
      .markdown-content pre code {
        background-color: transparent;
        padding: 0;
        border-radius: 0;
        font-size: inherit;
      }
      .markdown-content blockquote {
        border-left: 4px solid #e5e7eb;
        padding-left: 1em;
        margin: 1em 0;
        color: #6b7280;
      }
      .dark .markdown-content th, .dark .markdown-content td {
        border-color: #374151;
      }
      .dark .markdown-content th {
        background-color: #1f2937;
      }
      .dark .markdown-content code {
        background-color: #374151;
      }
      .dark .markdown-content pre {
        background-color: #1f2937;
      }
      .dark .markdown-content pre code {
        background-color: transparent;
      }
      .dark .markdown-content blockquote {
        border-left-color: #374151;
        color: #9ca3af;
      }
    `;
    document.head.appendChild(style);

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
      <div class="relative flex-1 overflow-hidden bg-white dark:bg-zinc-950">
        <div id="chatbot-body" class="absolute top-0 left-0 right-0 bottom-16 px-[clamp(1rem,calc((100vw-720px)/2),100rem)] pt-16 pb-8 space-y-2 overflow-y-auto bg-white dark:bg-zinc-950 text-black dark:text-gray-100"></div>
        <div id="chatbot-header" class="absolute top-0 w-full h-14 bg-white/20 backdrop-blur-md border-b border-gray-200 dark:border-zinc-600 text-gray-800 dark:text-gray-100 text-base font-semibold flex justify-between items-center px-[clamp(1rem,calc((100vw-720px)/2),100rem)]">
          <span>${cfg.chatbotName}</span>

          <!-- Desktop buttons (hidden on mobile) -->
          <div class="hidden md:flex gap-0">
            <button
              id="chatbot-download"
              title="Save chat history"
              class="text-base text-gray-900 dark:text-gray-100 px-4 py-4 transition hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            <button
              id="chatbot-reset"
              title="Start new chat"
              class="text-base text-gray-900 dark:text-gray-100 px-4 py-4 transition hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              id="chatbot-use-rag"
              title="Use RAG (experimental)"
              class="text-base px-4 py-4 transition hover:bg-black/10 dark:hover:bg-white/10 flex items-center gap-2"
              data-rag-enabled="false"
            >
              <div class="w-8 h-4 bg-gray-300 dark:bg-gray-600 rounded-full relative transition-all duration-300 ease-in-out" id="rag-toggle-track">
                <div class="w-3 h-3 bg-white rounded-full absolute top-0.5 left-0.5 transition-all duration-300 ease-in-out" id="rag-toggle-thumb"></div>
              </div>
              <span class="text-sm text-gray-900 dark:text-gray-100">RAG</span>
            </button>
            <button
              id="chatbot-theme-toggle"
              title="Toggle light/dark theme"
              class="text-base text-gray-900 dark:text-gray-100 px-4 py-4 transition hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center"
            >
              <svg id="theme-icon" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414M17.364 17.364l-1.414-1.414M7.05 7.05L5.636 5.636" />
              </svg>
            </button>
          </div>

          <!-- Mobile menu button (visible on mobile) -->
          <div class="md:hidden relative">
            <button
              id="chatbot-mobile-menu"
              class="text-base text-gray-900 dark:text-gray-100 px-4 py-4 transition hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v.01M12 12v.01M12 19v.01" />
              </svg>
            </button>

            <!-- Mobile dropdown menu -->
            <div id="chatbot-mobile-dropdown" class="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-gray-200 dark:border-zinc-600 hidden z-50">
              <div class="py-2">
                <button
                  id="chatbot-download-mobile"
                  class="w-full px-4 py-3 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-zinc-700 transition flex items-center gap-3"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Save Chat</span>
                </button>
                <button
                  id="chatbot-reset-mobile"
                  class="w-full px-4 py-3 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-zinc-700 transition flex items-center gap-3"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>New Chat</span>
                </button>
                <button
                  id="chatbot-theme-toggle-mobile"
                  class="w-full px-4 py-3 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-zinc-700 transition flex items-center justify-between"
                >
                  <div class="flex items-center gap-3">
                    <svg id="theme-icon-mobile" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round"
                            d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414M17.364 17.364l-1.414-1.414M7.05 7.05L5.636 5.636" />
                    </svg>
                    <span>Toggle Theme</span>
                  </div>
                </button>

                <hr class="my-2 border-gray-200 dark:border-zinc-600" />
                <div class="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase">Experimental</div>
                <button
                  id="chatbot-use-rag-mobile"
                  class="w-full px-4 py-3 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-zinc-700 transition flex items-center justify-between"
                  data-rag-enabled="false"
                >
                  <span>Use RAG</span>
                  <div class="w-8 h-4 bg-gray-300 dark:bg-gray-600 rounded-full relative transition-all duration-300 ease-in-out" id="rag-toggle-track-mobile">
                    <div class="w-3 h-3 bg-white rounded-full absolute top-0.5 left-0.5 transition-all duration-300 ease-in-out" id="rag-toggle-thumb-mobile"></div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div id="chatbot-footer" class="absolute bottom-0 w-full flex flex-col items-center px-[clamp(1rem,calc((100vw-720px)/2),100rem)] py-4">
          <div class="flex bg-white dark:bg-zinc-800 rounded-3xl shadow-lg border border-gray-300 dark:border-zinc-600 w-full">
            <textarea
              id="chatbot-input"
              placeholder="Type your message..."
              rows="1"
              class="flex-1 px-4 py-3 focus:outline-none resize-none bg-transparent text-gray-900 dark:text-gray-100 leading-snug max-h-[8rem] rounded-l-3xl"
            ></textarea>
            <button
              id="chatbot-send"
              class="px-6 py-3 text-gray-900 dark:text-gray-100 font-semibold hover:bg-gray-100 dark:hover:bg-zinc-700 transition rounded-r-3xl"
            >
              Send
            </button>
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Enter to send • Shift + Enter for new line
          </div>
        </div>
      </div>
    `;

    // Mobile menu toggle functionality
    const mobileMenuBtn = container.querySelector("#chatbot-mobile-menu");
    const mobileDropdown = container.querySelector("#chatbot-mobile-dropdown");

    mobileMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      mobileDropdown.classList.toggle("hidden");
    });

    // Close mobile menu when clicking outside
    document.addEventListener("click", (e) => {
      if (
        !mobileDropdown.classList.contains("hidden") &&
        !mobileDropdown.contains(e.target)
      ) {
        mobileDropdown.classList.add("hidden");
      }
    });

    // Modern RAG toggle functionality
    const useRagButton = container.querySelector("#chatbot-use-rag");
    const useRagButtonMobile = container.querySelector(
      "#chatbot-use-rag-mobile"
    );
    const ragToggleTrack = container.querySelector("#rag-toggle-track");
    const ragToggleThumb = container.querySelector("#rag-toggle-thumb");
    const ragToggleTrackMobile = container.querySelector(
      "#rag-toggle-track-mobile"
    );
    const ragToggleThumbMobile = container.querySelector(
      "#rag-toggle-thumb-mobile"
    );

    let ragEnabled = false;

    function updateRagToggleVisual(button, track, thumb, enabled) {
      if (enabled) {
        // Enabled state - neon blue
        track.className =
          "w-8 h-4 bg-blue-500 rounded-full relative transition-all duration-300 ease-in-out";
        thumb.className =
          "w-3 h-3 bg-white rounded-full absolute top-0.5 right-0.5 transition-all duration-300 ease-in-out shadow-md";
        button.setAttribute("data-rag-enabled", "true");
      } else {
        // Disabled state - gray
        track.className =
          "w-8 h-4 bg-gray-300 dark:bg-gray-600 rounded-full relative transition-all duration-300 ease-in-out";
        thumb.className =
          "w-3 h-3 bg-white rounded-full absolute top-0.5 left-0.5 transition-all duration-300 ease-in-out";
        button.setAttribute("data-rag-enabled", "false");
      }
    }

    function toggleRag() {
      ragEnabled = !ragEnabled;

      // Update both desktop and mobile visuals
      if (useRagButton && ragToggleTrack && ragToggleThumb) {
        updateRagToggleVisual(
          useRagButton,
          ragToggleTrack,
          ragToggleThumb,
          ragEnabled
        );
      }
      if (useRagButtonMobile && ragToggleTrackMobile && ragToggleThumbMobile) {
        updateRagToggleVisual(
          useRagButtonMobile,
          ragToggleTrackMobile,
          ragToggleThumbMobile,
          ragEnabled
        );
      }
    }

    // Desktop RAG toggle
    if (useRagButton) {
      useRagButton.addEventListener("click", (e) => {
        e.preventDefault();
        toggleRag();
      });
    }

    // Mobile RAG toggle
    if (useRagButtonMobile) {
      useRagButtonMobile.addEventListener("click", (e) => {
        e.preventDefault();
        toggleRag();
        mobileDropdown.classList.add("hidden"); // Close menu after action
      });
    }

    document.body.appendChild(toggleBtn);
    document.body.appendChild(container);

    //  ——— Theme management ———
    const themeToggleBtn = container.querySelector("#chatbot-theme-toggle");
    const themeToggleMobile = container.querySelector(
      "#chatbot-theme-toggle-mobile"
    );
    const themeIcon = themeToggleBtn?.querySelector("#theme-icon");
    const themeIconMobile =
      themeToggleMobile?.querySelector("#theme-icon-mobile");

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
    function updateIcons() {
      const moonPath = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />`;
      const sunPath = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414 M17.364 17.364l-1.414-1.414M7.05 7.05L5.636 5.636" />`;

      if (theme === "dark") {
        if (themeIcon) themeIcon.innerHTML = moonPath;
        if (themeIconMobile) themeIconMobile.innerHTML = moonPath;
      } else {
        if (themeIcon) themeIcon.innerHTML = sunPath;
        if (themeIconMobile) themeIconMobile.innerHTML = sunPath;
      }
    }
    updateIcons();

    // 4) Theme toggle handlers
    function toggleTheme() {
      theme = theme === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", theme === "dark");
      localStorage.setItem("chatbot-theme", theme);
      updateIcons();
    }

    if (themeToggleBtn) {
      themeToggleBtn.addEventListener("click", toggleTheme);
    }
    if (themeToggleMobile) {
      themeToggleMobile.addEventListener("click", () => {
        toggleTheme();
        mobileDropdown.classList.add("hidden"); // Close menu after action
      });
    }

    // Button event handlers for both desktop and mobile
    const downloadBtn = container.querySelector("#chatbot-download");
    const downloadBtnMobile = container.querySelector(
      "#chatbot-download-mobile"
    );
    const resetBtn = container.querySelector("#chatbot-reset");
    const resetBtnMobile = container.querySelector("#chatbot-reset-mobile");

    function downloadChatHistory() {
      const history = getFullChatHistory();
      const markdown = history
        .map(({ from, text, timestamp }) => {
          const role = from === "user" ? "🧑 User" : "🤖 Assistant";
          const time = new Date(timestamp).toLocaleString();
          return `## ${role} (${time})\n\n${text}\n`;
        })
        .join("\n---\n\n");
      const blob = new Blob([markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = cfg.downloadFilename || "chat-history.md";
      a.click();
      URL.revokeObjectURL(url);
    }

    function resetChat() {
      if (!cfg.resetWarning || confirm(cfg.resetWarning)) {
        localStorage.removeItem("chatbot-history");
        body.innerHTML = "";
        if (cfg.welcomeMessage) {
          appendMessage(cfg.welcomeMessage, "bot");
          saveMessage(cfg.welcomeMessage, "bot");
        }
      }
    }

    if (downloadBtn) downloadBtn.onclick = downloadChatHistory;
    if (downloadBtnMobile) {
      downloadBtnMobile.onclick = () => {
        downloadChatHistory();
        mobileDropdown.classList.add("hidden");
      };
    }
    if (resetBtn) resetBtn.onclick = resetChat;
    if (resetBtnMobile) {
      resetBtnMobile.onclick = () => {
        resetChat();
        mobileDropdown.classList.add("hidden");
      };
    }

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

    function appendMessage(text, from, timestamp = null, docs = []) {
      const div = document.createElement("div");
      div.className = `py-2 px-4 rounded-lg overflow-x-auto break-words markdown-content ${
        from === "user"
          ? "bg-gray-100 dark:bg-zinc-800 self-end ml-auto mr-4 text-left max-w-[60%]"
          : "self-center mx-auto text-left w-full"
      }`;

      const timeStr = timestamp
        ? new Date(timestamp).toLocaleString()
        : new Date().toLocaleString();

      const timeDiv = document.createElement("div");
      timeDiv.className =
        "text-xs text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-600";
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
        content.className = "overflow-hidden px-4";
        content.style.height = "0px";
        content.style.opacity = "0";
        content.style.transition = "height 0.3s ease, opacity 0.2s ease";
        content.style.willChange = "height, opacity";

        // 4) Fill in each document snippet
        docs.forEach((d, index) => {
          const docDiv = document.createElement("div");
          docDiv.className =
            "mb-3 p-4 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-600 shadow-sm";

          // Clean and truncate text
          const cleanText = d.snippet.replace(/\n/g, " ").trim();
          const maxLength = 300;
          const displayText =
            cleanText.length > maxLength
              ? cleanText.substring(0, maxLength) + "..."
              : cleanText;

          docDiv.innerHTML = `
            <div class="flex items-start justify-between mb-2">
              <span class="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full">
                Source ${index + 1}
              </span>
            </div>
            <p class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              ${displayText}
            </p>
          `;

          content.appendChild(docDiv);
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

      // Create response message that we'll update during streaming
      let botAnswerRaw = ""; // Keep track of raw markdown text
      let docs = [];
      const botMessageDiv = appendMessage("", "bot");

      try {
        const response = await fetch(cfg.apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            query: msg,
            history: extractChatRecords(),
            embedding_model: "huggingface:thellert/physbert_cased",
            llm_model: "stanford:gpt-4.omini",
            use_rag: ragEnabled,
            max_documents: 5,
            score_threshold: 0,
            use_opensearch: false,
            use_qdrant: true,
            knowledge_base: "mli",
            prompt:
              "You are a helpful assistant. Output answers in Markdown. Use $ and $$ to surround mathematical formulas. Try to tie your answer to the provided list of sources. Say you don't know if you can't. Be as concise as possible.",
            files: [],
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === "token") {
                  botAnswerRaw = data.partial_answer || "";
                  // Update the message content with streaming tokens (render current raw text)
                  const contentDiv =
                    botMessageDiv.querySelector(".prose") || botMessageDiv;
                  contentDiv.innerHTML = marked.parse(botAnswerRaw);
                  // Scroll to bottom as we stream
                  body.scrollTop = body.scrollHeight;
                } else if (data.type === "documents") {
                  docs = data.data || [];
                } else if (data.type === "status") {
                  // Show status updates
                  if (!botAnswerRaw) {
                    const contentDiv =
                      botMessageDiv.querySelector(".prose") || botMessageDiv;
                    contentDiv.innerHTML = `<em>${data.message}</em>`;
                  }
                } else if (data.type === "error") {
                  throw new Error(data.message);
                }
              } catch (parseError) {
                // Ignore parsing errors for incomplete JSON chunks
                continue;
              }
            }
          }
        }

        // Final processing after streaming is complete
        if (botAnswerRaw) {
          // Remove old content and re-render with documents
          botMessageDiv.remove();
          appendMessage(botAnswerRaw, "bot", null, docs);
          saveMessage(botAnswerRaw, "bot", null, docs);
        } else {
          botMessageDiv.remove();
          const failMsg = "_Sorry, I couldn't generate a response._";
          appendMessage(failMsg, "bot");
          saveMessage(failMsg, "bot");
        }
      } catch (error) {
        console.error("Error from backend:", error);
        botMessageDiv.remove();
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

    // Event handlers are now defined above with the responsive menu system

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
