# Simple Chatbot Widget

This repository contains a simple chatbot widget that you can easily integrate into your webpage. The chatbot supports Markdown rendering, MathJax for mathematical formulas, and saves chat history locally in the browser.

## Features

- **Markdown Support**: Render chatbot responses in Markdown.
- **MathJax Integration**: Display mathematical formulas using `$...$` or `$$...$$`.
- **Chat History**: Automatically saves chat history in `localStorage`.
- **Download Chat**: Export chat history as a Markdown file.
- **Customizable Backend**: Connect to your own backend API for chatbot responses.

## Run the demo

Open the `index.html` file (located in the root of this repository) in your browser, play with the chatbot, enjoy! 😊

**Note**: _To access the backend API in the demo webpage, ensure you are connected to the SLAC VPN._

## Integration into Your Webpage

1. **Include the Chatbot Widget**:
   Add the following lines to your HTML file to include the built CSS and JavaScript files (from the `dist` folder), and configure the chatbot:

   The css should go into the `<head>`:

   ```html
   <!-- Include the chatbot widget CSS -->
   <link rel="stylesheet" href="chatbot-widget.css" />
   ```

   Then configuration and script in the `<body>`:

   ```html
   <!-- [Optional] Configure Chatbot Widget -->
   <script>
     window.ChatbotConfig = {
       apiUrl: "http://localhost:8000/ask",
       resetWarning:
         "Start a new conversation? This will erase current messages.", // set to falsy value to disable reset warning
       welcomeMessage: "👋 Hello! Ask me anything about our research!",
       downloadFilename: "chat-history.md",
       chatbotName: "🤖 Chatbot",
     };
   </script>
   <!-- Load Chatbot Widget -->
   <script src="chatbot-widget.min.js"></script>
   ```

2. **Run a Backend API**:
   The chatbot expects a backend API as configured in `apiUrl` that accepts a POST request with the following JSON payload:

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
   Open or serve the `index.html` file in your browser to view the chatbot in action. You can use the `index.html` file located in the root directory of this repository as a reference.

## Customization

You can customize the chatbot widget by modifying the `ChatbotConfig` object or editing the source code. Below are the available customization options:

- **Backend API URL**: Update the `apiUrl` property to point to your backend API. Example:

  ```javascript
  window.ChatbotConfig = {
    apiUrl: "https://your-backend-api.com/chat",
  };
  ```

- **Welcome Message**: Set a custom welcome message by updating the `welcomeMessage` property in the `ChatbotConfig` object. Example:

  ```javascript
  window.ChatbotConfig = {
    welcomeMessage: "👋 Hi there! How can I assist you today?",
  };
  ```

- **Reset Warning**: Enable or disable the reset confirmation dialog by setting the `resetWarning` property. Example:

  ```javascript
  window.ChatbotConfig = {
    resetWarning: "Are you sure you want to start a new conversation?",
  };
  ```

  To disable the reset warning, set it to a falsy value (e.g., `null` or `""`).

- **Chatbot Name**: Change the chatbot's name displayed in the header by modifying the `chatbotName` property. Example:

  ```javascript
  window.ChatbotConfig = {
    chatbotName: "🤖 Research Assistant",
  };
  ```

- **Download Filename**: Customize the filename for the exported chat history by modifying the `downloadFilename` property. Example:

  ```javascript
  window.ChatbotConfig = {
    downloadFilename: "my-chat-history.md",
  };
  ```

- **Styling**: Modify the chatbot's appearance by editing the Tailwind CSS classes in the source code (`chatbot-widget.js`). For example, you can change the button colors, font sizes, or layout.

- **MathJax Configuration**: Adjust the MathJax settings for rendering mathematical formulas by editing the `MathJax` object in the `loadDependencies` function.

- **Markdown Rendering**: Customize how Markdown is rendered by modifying the `marked` configuration in the `loadDependencies` function.

Feel free to explore the source code (`src/chatbot-widget.js`) for additional customization

## Commands in `package.json`

- `npm run serve:demo`: Serves the demo application.
- `npm run serve`: Starts a development server using files from the `src` directory.
- `npm run build`: Builds the JavaScript and CSS files for production into the `dist` directory.

## Development

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

## Dependencies

- **Tailwind CSS**: For styling the chatbot widget.
- **MathJax**: For rendering mathematical formulas.
- **Marked.js**: For Markdown rendering.

## License

This project is licensed under the MIT License. Feel free to use and modify it as needed.
