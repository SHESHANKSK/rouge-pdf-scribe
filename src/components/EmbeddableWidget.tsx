
import React, { useEffect } from 'react';
import ChatbotWidget from './ChatbotWidget';

// This component handles the web component integration
interface EmbeddableWidgetProps {
  'bot-name'?: string;
  'primary-color'?: string;
  'pdf-url'?: string;
}

const EmbeddableWidget: React.FC<EmbeddableWidgetProps> = (props) => {
  useEffect(() => {
    // Add Bootstrap CSS if not already present
    if (!document.querySelector('link[href*="bootstrap"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css';
      document.head.appendChild(link);
    }
  }, []);

  return (
    <ChatbotWidget
      botName={props['bot-name']}
      primaryColor={props['primary-color']}
      pdfUrl={props['pdf-url']}
    />
  );
};

export default EmbeddableWidget;
