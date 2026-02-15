/**
 * Translations configuration
 * Supports English (en) and Spanish (es)
 */

export type Language = 'en' | 'es';

export const translations = {
  en: {
    // Header
    appName: 'Jordan',
    appSubtitle: 'PLTW Support Assistant',
    adminLogin: 'Admin Login',
    adminDashboard: 'Admin Dashboard',
    
    // Welcome screen
    welcomeTitle: "Hello! I'm Jordan",
    welcomeSubtitle: "I'm happy to help educators with questions about implementation, training, rostering, assessments, payment, and grants.",
    popularTopics: 'Popular topics and FAQs:',
    
    // Topic categories
    topics: {
      implementation: {
        title: 'Implementation',
        icon: '📚',
        questions: [
          'How do I implement PLTW in my school?',
          'What support is available during implementation?'
        ]
      },
      rostering: {
        title: 'Rostering',
        icon: '👥',
        questions: [
          'How do I upload student rosters?',
          'Can I integrate with my Student Information System?'
        ]
      },
      training: {
        title: 'Training',
        icon: '🎓',
        questions: [
          'What professional development is available?',
          'Is training available online or in-person?'
        ]
      },
      payment: {
        title: 'Payment',
        icon: '💳',
        questions: [
          'What are the program fees?',
          'What payment options are available?'
        ]
      },
      grants: {
        title: 'Grants',
        icon: '🏆',
        questions: [
          'What grants are available for PLTW?',
          'Can PLTW help with grant applications?'
        ]
      }
    },
    
    // Chat interface
    askQuestion: 'Ask a question...',
    connecting: 'Connecting to chat...',
    justNow: 'just now',
    
    // Escalation
    needHelp: 'Need Additional Help?',
    escalationMessage: 'For more complex questions, please contact our Solution Center:',
    phone: 'Phone',
    email: 'Email',
    
    // Feedback
    helpful: 'Helpful',
    notHelpful: 'Not helpful',
    
    // Login modal
    loginTitle: 'Admin Login',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    cancel: 'Cancel',
    login: 'Login',
    loggingIn: 'Logging in...',
    
    // Language toggle
    switchLanguage: 'Switch to Spanish',
    languageChangeTitle: 'Change Language?',
    languageChangeMessage: 'Switching languages will clear your current conversation. Do you want to continue?',
    confirm: 'Confirm',
    
    // File upload
    removeFile: 'Remove file',
    retryUpload: 'Retry upload',
    waitForUploads: 'Wait for uploads to complete',
    sendMessage: 'Send message',
    
    // Sources/Citations
    sources: 'Sources',

    // Clear chat
    clearChat: 'Clear Chat',
    clearConversationTitle: 'Clear Conversation?',
    clearConversationMessage: 'Are you sure you want to clear this conversation? This action cannot be undone.',

    // Queue status
    inQueue: "You're in Queue!",
    ticket: 'Ticket',
    queuePosition: 'Queue Position',
    estimatedWait: 'Estimated Wait',
    minutes: 'minutes',
    immediateAssistance: 'Need immediate assistance?',

    // Escalation (additional)
    escalationButton: '🆘 Connect with Human Agent',
    escalationInfo: 'For more complex questions, you can talk to our support team or contact us directly:',
  },
  es: {
    // Header
    appName: 'Jordan',
    appSubtitle: 'Asistente de Soporte PLTW',
    adminLogin: 'Inicio de Sesión Admin',
    adminDashboard: 'Panel de Administración',
    
    // Welcome screen
    welcomeTitle: '¡Hola! Soy Jordan',
    welcomeSubtitle: 'Estoy aquí para ayudar a los educadores con preguntas sobre implementación, capacitación, registro de estudiantes, evaluaciones, pagos y becas.',
    popularTopics: 'Temas populares y preguntas frecuentes:',
    
    // Topic categories
    topics: {
      implementation: {
        title: 'Implementación',
        icon: '📚',
        questions: [
          '¿Cómo implemento PLTW en mi escuela?',
          '¿Qué apoyo está disponible durante la implementación?'
        ]
      },
      rostering: {
        title: 'Registro',
        icon: '👥',
        questions: [
          '¿Cómo cargo las listas de estudiantes?',
          '¿Puedo integrar con mi Sistema de Información Estudiantil?'
        ]
      },
      training: {
        title: 'Capacitación',
        icon: '🎓',
        questions: [
          '¿Qué desarrollo profesional está disponible?',
          '¿La capacitación está disponible en línea o presencial?'
        ]
      },
      payment: {
        title: 'Pagos',
        icon: '💳',
        questions: [
          '¿Cuáles son las tarifas del programa?',
          '¿Qué opciones de pago están disponibles?'
        ]
      },
      grants: {
        title: 'Becas',
        icon: '🏆',
        questions: [
          '¿Qué becas están disponibles para PLTW?',
          '¿Puede PLTW ayudar con las solicitudes de becas?'
        ]
      }
    },
    
    // Chat interface
    askQuestion: 'Haz una pregunta...',
    connecting: 'Conectando al chat...',
    justNow: 'ahora mismo',
    
    // Escalation
    needHelp: '¿Necesita Ayuda Adicional?',
    escalationMessage: 'Para preguntas más complejas, comuníquese con nuestro Centro de Soluciones:',
    phone: 'Teléfono',
    email: 'Correo',
    
    // Feedback
    helpful: 'Útil',
    notHelpful: 'No útil',
    
    // Login modal
    loginTitle: 'Inicio de Sesión Admin',
    emailLabel: 'Correo Electrónico',
    passwordLabel: 'Contraseña',
    cancel: 'Cancelar',
    login: 'Iniciar Sesión',
    loggingIn: 'Iniciando sesión...',
    
    // Language toggle
    switchLanguage: 'Cambiar a Inglés',
    languageChangeTitle: '¿Cambiar Idioma?',
    languageChangeMessage: 'Cambiar de idioma borrará su conversación actual. ¿Desea continuar?',
    confirm: 'Confirmar',
    
    // File upload
    removeFile: 'Eliminar archivo',
    retryUpload: 'Reintentar carga',
    waitForUploads: 'Espere a que se completen las cargas',
    sendMessage: 'Enviar mensaje',
    
    // Sources/Citations
    sources: 'Fuentes',

    // Clear chat
    clearChat: 'Limpiar Chat',
    clearConversationTitle: '¿Limpiar Conversación?',
    clearConversationMessage: '¿Está seguro de que desea limpiar esta conversación? Esta acción no se puede deshacer.',

    // Queue status
    inQueue: '¡Estás en la Cola!',
    ticket: 'Ticket',
    queuePosition: 'Posición en la Cola',
    estimatedWait: 'Tiempo de Espera Estimado',
    minutes: 'minutos',
    immediateAssistance: '¿Necesita asistencia inmediata?',

    // Escalation (additional)
    escalationButton: '🆘 Conectar con un Agente Humano',
    escalationInfo: 'Para preguntas más complejas, puede hablar con nuestro equipo de soporte o contactarnos directamente:',
  }
} as const;

export type TranslationKey = keyof typeof translations.en;

/**
 * Get translation for a given key and language
 */
export function t(key: string, language: Language): string {
  const keys = key.split('.');
  let value: any = translations[language];
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback to English if key not found
      value = translations.en;
      for (const fallbackKey of keys) {
        if (value && typeof value === 'object' && fallbackKey in value) {
          value = value[fallbackKey];
        } else {
          return key; // Return key if not found
        }
      }
      break;
    }
  }
  
  return typeof value === 'string' ? value : key;
}
