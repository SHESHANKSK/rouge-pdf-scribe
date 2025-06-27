
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
  pdfUrl = '/assets/faq.pdf'
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
        <Card className="fixed bottom-6 right-6 w-96 h-[500px] z-50 shadow-2xl border-0 overflow-hidden bg-white">
          {/* Header */}
          <div 
            className="p-4 text-white flex items-center justify-between"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="flex items-center gap-2">
              <FileText size={20} />
              <span className="font-semibold">{botName}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 p-1"
              onClick={() => setIsOpen(false)}
            >
              <X size={20} />
            </Button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 h-96">
            {isInitializing ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2" style={{ borderColor: primaryColor }}></div>
                  <p className="text-gray-600">Initializing AI assistant...</p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.isBot
                        ? 'bg-white text-gray-800 shadow-sm'
                        : 'text-white shadow-sm'
                    }`}
                    style={{
                      backgroundColor: message.isBot ? 'white' : primaryColor
                    }}
                  >
                    <p className="text-sm">{message.text}</p>
                    <p className={`text-xs mt-1 ${message.isBot ? 'text-gray-500' : 'text-white/80'}`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-lg shadow-sm max-w-[80%]">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t bg-white">
            <div className="flex gap-2">
              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about the PDF..."
                disabled={isLoading || isInitializing}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !inputText.trim() || isInitializing}
                size="sm"
                className="text-white"
                style={{ backgroundColor: primaryColor }}
              >
                <Send size={16} />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
};

export default ChatbotWidget;
