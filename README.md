# Simple Chatbot Widget

This repository contains a simple chatbot widget that you can easily integrate into your webpage. The chatbot supports Markdown rendering, MathJax for mathematical formulas, and saves chat history locally in the browser.

## Features

- **Markdown Support**: Render chatbot responses in Markdown.
- **MathJax Integration**: Display mathematical formulas using `$...$` or `$$...$$`.
- **Chat History**: Automatically saves chat history in `localStorage`.
- **Download Chat**: Export chat history as a Markdown file.
- **Customizable Backend**: Connect to your own backend API for chatbot responses.

## How to Use

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/your-username/simple-chatbot.git
   cd simple-chatbot
   ```

2. **Include the Files in Your Webpage**:
   Add the following lines to your HTML file:

   ```html
   <!-- Include the chatbot widget -->
   <script src="chatbot-widget.js"></script>
   ```

3. **Configure the Chatbot**:
   Add a configuration script to your HTML file to customize the chatbot:

   ```html
   <script>
     window.ChatbotConfig = {
       welcomeMessage: "👋 Hello! Ask me anything about our research!",
     };
   </script>
   ```

4. **Run a Backend API**:
   The chatbot expects a backend API at `http://localhost:8000/ask` that accepts a POST request with the following JSON payload:

   ```json
   {
     "query": "User's message",
     "history": [
       { "role": "user", "content": "Previous user message" },
       { "role": "assistant", "content": "Previous bot response" }
     ],
     "embedding_model": "huggingface:thellert/physbert_cased",
     "llm_model": "ollama:llama3.1:latest",
     "max_documents": 5,
     "score_threshold": 0,
     "use_opensearch": false,
     "prompt": "You are a helpful assistant. Output answers in Markdown. Use $ and $$ to surround mathematical formulas. Try to tie your answer to the provided list of sources. Say you don't know if you can't. Be as concise as possible.",
     "files": []
   }
   ```

   The API should return a response in the following format:

   ```json
   {
     "answer": "Bot's response in Markdown format"
   }
   ```

5. **Open the HTML File**:
   Open `index.html` in your browser to see the chatbot in action.

## Customization

- **Welcome Message**: Set a custom welcome message in the `ChatbotConfig` object.
- **Backend URL**: Update the `fetch` URL in `chatbot-widget.js` to point to your backend API.

## Dependencies

- **Tailwind CSS**: For styling the chatbot widget.
- **MathJax**: For rendering mathematical formulas.
- **Marked.js**: For Markdown rendering.

## License

This project is licensed under the MIT License. Feel free to use and modify it as needed.
