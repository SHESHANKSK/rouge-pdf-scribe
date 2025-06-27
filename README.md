
# 🤖 PDF AI Chatbot Widget

A fully local, AI-powered chatbot widget that can answer questions based on PDF documents using browser-based language models.

## ✨ Features

- **🔒 Fully Local Processing**: All AI processing runs in the browser using WebGPU/CPU
- **📄 PDF Knowledge Base**: Automatically extracts and processes PDF content
- **🧠 Semantic Search**: Uses transformer embeddings for intelligent context retrieval
- **💬 Modern Chat Interface**: Beautiful, responsive chat UI with Bootstrap 5
- **🎨 Customizable**: Configurable colors, bot name, and PDF source
- **🔧 Easy Embedding**: Can be embedded as a Web Component in any website
- **🚀 No External APIs**: Complete privacy with no external dependencies

## 🛠️ Technology Stack

- **Frontend**: React + TypeScript
- **AI Models**: @huggingface/transformers (transformers.js)
- **PDF Processing**: pdfjs-dist
- **Styling**: Bootstrap 5 + Tailwind CSS
- **Build**: Vite

## 🚀 Quick Start

### Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pdf-chatbot-widget
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Visit `http://localhost:8080` to see the demo

### Usage

Click the red chat button in the bottom-right corner to open the chatbot. The AI will:

1. Load and process the PDF document
2. Initialize language models (may take a moment on first load)
3. Answer questions based on the PDF content

Try asking questions like:
- "What is this chatbot?"
- "How does it work?"
- "Is my data secure?"

## 📦 Embedding in Your Website

### Basic Embedding

```html
<!-- Include the chatbot script -->
<script src="https://your-domain.com/chatbot-widget.js"></script>

<!-- Add the chatbot widget -->
<pdf-chatbot-widget 
  bot-name="Your Assistant" 
  primary-color="#dc3545" 
  pdf-url="/path/to/your/document.pdf">
</pdf-chatbot-widget>
```

### Configuration Options

| Attribute | Description | Default |
|-----------|-------------|---------|
| `bot-name` | Display name for the chatbot | "PDF Assistant" |
| `primary-color` | Primary color (hex code) | "#dc3545" |
| `pdf-url` | URL to the PDF document | "/assets/faq.pdf" |

### Example with Custom Configuration

```html
<pdf-chatbot-widget 
  bot-name="Support Assistant" 
  primary-color="#007bff" 
  pdf-url="/docs/user-manual.pdf">
</pdf-chatbot-widget>
```

## 🎯 How It Works

### 1. PDF Processing
- Uses `pdfjs-dist` to extract text from PDF files
- Splits content into manageable chunks for processing
- Maintains context overlap between chunks

### 2. AI Processing
- **Embedding Model**: `Xenova/all-MiniLM-L6-v2` for semantic search
- **Generation Model**: `Xenova/flan-t5-small` for response generation
- **Fallback**: Keyword-based search if embedding fails

### 3. RAG Pipeline
1. User submits a question
2. Query is embedded into vector space
3. Semantic search finds relevant PDF chunks
4. Language model generates response from context
5. Response is displayed in chat interface

## 🔧 Customization

### Styling
The widget uses Bootstrap 5 classes and can be customized via:
- CSS custom properties
- Bootstrap theme variables
- Direct style overrides

### PDF Content
Replace the sample PDF with your own:
1. Add your PDF to the `public/assets/` directory
2. Update the `pdf-url` attribute
3. Ensure the PDF is accessible from your domain

### AI Models
To use different models, modify `ChatService.ts`:
```typescript
// Change embedding model
this.embedder = await pipeline(
  'feature-extraction',
  'your-preferred-embedding-model'
);

// Change generation model
this.generator = await pipeline(
  'text2text-generation',
  'your-preferred-generation-model'
);
```

## 🌐 Browser Support

- **Chrome/Edge**: Full support including WebGPU acceleration
- **Firefox**: CPU fallback (WebGPU support coming soon)
- **Safari**: CPU fallback
- **Mobile**: Limited support due to memory constraints

### Requirements
- Modern browser with WebAssembly support
- Minimum 4GB RAM recommended
- Good internet connection for initial model download

## 📊 Performance

### Model Sizes
- **Embedding Model**: ~23MB
- **Generation Model**: ~60MB
- **Total Download**: ~85MB (cached after first load)

### Initialization Time
- **First Load**: 30-60 seconds (model download + initialization)
- **Subsequent Loads**: 5-10 seconds (models cached)
- **WebGPU**: 2-3x faster processing vs CPU

## 🛠️ Development

### Project Structure
```
src/
├── components/
│   ├── ChatbotWidget.tsx      # Main chat interface
│   └── EmbeddableWidget.tsx   # Web component wrapper
├── services/
│   ├── ChatService.ts         # AI processing logic
│   └── PDFService.ts          # PDF parsing logic
└── pages/
    └── Index.tsx              # Demo page
```

### Building for Production

```bash
# Build the application
npm run build

# Preview production build
npm run preview
```

### Creating Web Component Bundle

For Angular Elements integration:
1. Build the React app
2. Configure Angular Elements wrapper
3. Bundle as custom element

## 🔍 Troubleshooting

### Common Issues

**Models fail to load**
- Check browser console for WebGL/WebGPU support
- Ensure sufficient memory (4GB+ recommended)
- Try CPU fallback mode

**PDF not loading**
- Verify PDF URL is accessible
- Check CORS headers for cross-origin PDFs
- Ensure PDF is not password-protected

**Poor response quality**
- Verify PDF contains relevant text content
- Try more specific questions
- Check if PDF text extraction worked properly

### Debug Mode
Enable detailed logging by opening browser console. The application logs:
- Model initialization progress
- PDF processing status
- Embedding computation progress
- Query processing details

## 📝 License

MIT License - feel free to use in commercial projects.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📧 Support

For issues and questions:
- Check the browser console for error messages
- Verify your PDF content is text-based (not scanned images)
- Ensure your browser supports WebAssembly
- Try the demo page first to verify functionality

---

Built with ❤️ using modern web technologies for complete privacy and local processing.
