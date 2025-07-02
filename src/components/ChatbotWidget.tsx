
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ChatService } from '../services/ChatService';
import { PDFService } from '../services/PDFService';

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

interface ChatbotWidgetProps {
  botName?: string;
  primaryColor?: string;
  pdfUrl?: string;
}

const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({
  botName = 'PDF Assistant',
  primaryColor = '#dc3545',
  pdfUrl = '/assets/knowledge.pdf'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatService = useRef<ChatService | null>(null);
  const pdfService = useRef<PDFService | null>(null);

  useEffect(() => {
    initializeServices();
  }, [pdfUrl]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeServices = async () => {
    try {
      setIsInitializing(true);
      
      // Initialize PDF service
      pdfService.current = new PDFService();
      await pdfService.current.initialize();
      
      // Load and process PDF
      console.log('Loading PDF from:', pdfUrl);
      const pdfText = await pdfService.current.extractTextFromPDF(pdfUrl);
      const chunks = pdfService.current.chunkText(pdfText);
      
      // Initialize chat service with processed chunks
      chatService.current = new ChatService();
      await chatService.current.initialize(chunks);
      
      // Add welcome message
      const welcomeMessage: Message = {
        id: 'welcome',
        text: `Hello! I'm ${botName}, your AI assistant. I can answer questions based on the loaded PDF document. How can I help you today?`,
        isBot: true,
        timestamp: new Date()
      };
      
      setMessages([welcomeMessage]);
      setIsInitializing(false);
      
      console.log('Chatbot initialized successfully');
    } catch (error) {
      console.error('Failed to initialize chatbot:', error);
      setIsInitializing(false);
      
      const errorMessage: Message = {
        id: 'error',
        text: 'Sorry, I encountered an error during initialization. Please try refreshing the page.',
        isBot: true,
        timestamp: new Date()
      };
      
      setMessages([errorMessage]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading || !chatService.current) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isBot: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await chatService.current.generateResponse(inputText);
      
      // Simulate typing delay for better UX
      setTimeout(() => {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: response,
          isBot: true,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, botMessage]);
        setIsLoading(false);
        setIsTyping(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error generating response:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error while processing your request. Please try again.',
        isBot: true,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Widget Button */}
      {!isOpen && (
        <div 
          className="fixed bottom-6 right-6 z-50 cursor-pointer animate-pulse"
          onClick={() => setIsOpen(true)}
        >
          <div 
            className="w-16 h-16 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 transition-transform duration-200"
            style={{ backgroundColor: primaryColor }}
          >
            <MessageCircle size={28} />
          </div>
        </div>
      )}

      {/* Chat Interface */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] z-50 shadow-lg border border-danger rounded overflow-hidden bg-white">
          {/* Header */}
          <div className="p-3 bg-danger text-white d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <FileText size={20} />
              <span className="fw-bold">{botName}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 p-1 border-0"
              onClick={() => setIsOpen(false)}
            >
              <X size={20} />
            </Button>
          </div>

          {/* Messages Area */}
          <div className="flex-fill overflow-auto p-3 bg-light" style={{ height: '360px' }}>
            {isInitializing ? (
              <div className="d-flex align-items-center justify-content-center h-100">
                <div className="text-center">
                  <div className="spinner-border text-danger mb-2" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="text-muted">Initializing AI assistant...</p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`d-flex ${message.isBot ? 'justify-content-start' : 'justify-content-end'} mb-3`}
                >
                  <div
                    className={`p-2 rounded shadow-sm ${
                      message.isBot
                        ? 'bg-white text-dark border'
                        : 'bg-danger text-white'
                    }`}
                    style={{ maxWidth: '80%' }}
                  >
                    <p className="mb-1 small">{message.text}</p>
                    <p className={`mb-0 ${message.isBot ? 'text-muted' : 'text-white-50'}`} style={{ fontSize: '0.75rem' }}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="d-flex justify-content-start mb-3">
                <div className="bg-white p-2 rounded shadow-sm border">
                  <div className="d-flex gap-1">
                    <div className="bg-secondary rounded-circle" style={{ width: '8px', height: '8px', animation: 'bounce 1.4s infinite' }}></div>
                    <div className="bg-secondary rounded-circle" style={{ width: '8px', height: '8px', animation: 'bounce 1.4s infinite 0.1s' }}></div>
                    <div className="bg-secondary rounded-circle" style={{ width: '8px', height: '8px', animation: 'bounce 1.4s infinite 0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 border-top bg-white">
            <div className="d-flex gap-2">
              <input
                type="text"
                className="form-control"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about the knowledge base..."
                disabled={isLoading || isInitializing}
              />
              <button
                className="btn btn-danger"
                onClick={handleSendMessage}
                disabled={isLoading || !inputText.trim() || isInitializing}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatbotWidget;
