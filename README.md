# Simple Chatbot Widget

This repository contains a simple chatbot widget that you can easily integrate into your webpage. The chatbot supports Markdown rendering, MathJax for mathematical formulas, and saves chat history locally in the browser.

## Features

- **Markdown Support**: Render chatbot responses in Markdown.
- **MathJax Integration**: Display mathematical formulas using `$...$` or `$$...$$`.
- **Chat History**: Automatically saves chat history in `localStorage`.
- **Download Chat**: Export chat history as a Markdown file.
- **Customizable Backend**: Connect to your own backend API for chatbot responses.

## How to Use

### Development

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Run in Development Mode**:

   Use the following command to start a development server that uses all files from the `src` directory:

   ```bash
   npm run serve
   ```

   This will start a local development server and watch for changes in the source files.

3. **Build the Project**:

   To build the JavaScript and CSS files for production, run:

   ```bash
   npm run build
   ```

   The output files will be generated in the `dist` directory.

4. **Run the Demo**:

   To run the demo, first ensure the project is built (using `npm run build`), then start the demo server:

   ```bash
   npm run serve:demo
   ```

   Open the demo in your browser to see the chatbot in action.

### Integration into Your Webpage

1. **Include the Chatbot Widget**:
   Add the following lines to your HTML file to include the built CSS and JavaScript files (from the `dist` folder if you have run build), and configure the chatbot:

   The css should go into the `<head>`:

   ```html
   <!-- Include the chatbot widget CSS -->
   <link rel="stylesheet" href="chatbot-widget.css" />
   ```

   Then configuration and script in the `<body>`:

   ```html
   <!-- Configure the chatbot -->
   <script>
     window.ChatbotConfig = {
       welcomeMessage: "👋 Hello! Ask me anything about our research!",
     };
   </script>
   <!-- Include the chatbot widget JavaScript -->
   <script src="chatbot-widget.min.js"></script>
   ```

2. **Run a Backend API**:
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

3. **Open the HTML File**:
   Open or serve your `index.html` file in a browser to see the chatbot in action.

## Customization

- **Welcome Message**: Set a custom welcome message in the `ChatbotConfig` object.
- **Backend URL**: Update the `fetch` URL in `chatbot-widget.js` to point to your backend API.

## Commands in `package.json`

- `npm run serve`: Starts a development server using files from the `src` directory.
- `npm run build`: Builds the JavaScript and CSS files for production into the `dist` directory.
- `npm run serve:demo`: Serves the demo application. Requires the project to be built first.

## Dependencies

- **Tailwind CSS**: For styling the chatbot widget.
- **MathJax**: For rendering mathematical formulas.
- **Marked.js**: For Markdown rendering.

## License

This project is licensed under the MIT License. Feel free to use and modify it as needed.
