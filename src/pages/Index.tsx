
import ChatbotWidget from '../components/ChatbotWidget';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Demo Page Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🤖 PDF AI Chatbot Widget
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Fully local, AI-powered chatbot that answers questions from PDF documents
          </p>
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">✨ Features</h2>
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div>
                <h3 className="font-semibold text-red-600 mb-2">🔒 Fully Local Processing</h3>
                <p className="text-gray-600">All AI processing runs in your browser. No external APIs, complete privacy.</p>
              </div>
              <div>
                <h3 className="font-semibold text-red-600 mb-2">📄 PDF Knowledge Base</h3>
                <p className="text-gray-600">Automatically extracts and processes PDF content for intelligent Q&A.</p>
              </div>
              <div>
                <h3 className="font-semibold text-red-600 mb-2">🧠 Semantic Search</h3>
                <p className="text-gray-600">Uses transformer embeddings for intelligent context retrieval.</p>
              </div>
              <div>
                <h3 className="font-semibold text-red-600 mb-2">🎨 Embeddable Widget</h3>
                <p className="text-gray-600">Easy to embed in any website with customizable styling.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Content */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">How to Use</h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-600">
              <li>Click the red chat button in the bottom-right corner to open the chatbot</li>
              <li>Wait for the AI models to initialize (this may take a moment on first load)</li>
              <li>Ask questions about the PDF content - try "What is this chatbot?" or "How does it work?"</li>
              <li>The AI will search through the PDF and provide relevant answers</li>
            </ol>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Embedding Instructions</h2>
            <p className="text-gray-600 mb-4">To embed this chatbot in your website, add this HTML:</p>
            <div className="bg-gray-100 p-4 rounded-lg overflow-x-auto">
              <code className="text-sm">
                {`<!-- Include the chatbot script -->
<script src="https://your-domain.com/chatbot-widget.js"></script>

<!-- Add the chatbot widget -->
<pdf-chatbot-widget 
  bot-name="Your Assistant" 
  primary-color="#dc3545" 
  pdf-url="/path/to/your/document.pdf">
</pdf-chatbot-widget>`}
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* The actual chatbot widget */}
      <ChatbotWidget 
        botName="PDF Assistant"
        primaryColor="#dc3545"
        pdfUrl="/assets/sample-faq.pdf"
      />
    </div>
  );
};

export default Index;
