import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../features/auth/context/AuthContext';
import '../../styles/components/SupportChatbot.scss';
import { useNavigate, useLocation } from 'react-router-dom';

const SupportChatbot = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);

    // Hide chatbot on specific routes where it interferes with UI (like Team Chat)
    const shouldHide = location.pathname.startsWith('/team/') || location.pathname.startsWith('/chat');



    // Initial Menu Options
    const MAIN_MENU = [
        { id: 'create', label: '🛠️ Crear Servicio/Proyecto' },
        { id: 'levels', label: '⭐ Niveles y XP' },
        { id: 'fees', label: '💰 Comisiones' },
        { id: 'support', label: '📞 Contactar Humano' }
    ];

    const [messages, setMessages] = useState([
        { id: 1, text: "¡Hola! Soy tu asistente. Elige una opción para ayudarte:", sender: 'bot' }
    ]);
    const [currentOptions, setCurrentOptions] = useState(MAIN_MENU);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen, currentOptions]);

    useEffect(() => {
        const handleOpenSupport = () => setIsOpen(true);
        window.addEventListener('openSupportChatbot', handleOpenSupport);
        return () => window.removeEventListener('openSupportChatbot', handleOpenSupport);
    }, []);

    const handleOptionClick = (option) => {
        // 1. Add User Selection as Message
        const userMsg = { id: Date.now(), text: option.label, sender: 'user' };
        setMessages(prev => [...prev, userMsg]);
        setCurrentOptions([]); // Hide options while thinking

        // 2. Simulate Bot Response
        setTimeout(() => {
            const response = getResponseForId(option.id);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: response.text,
                sender: 'bot',
                action: response.action
            }]);

            // 3. Show "Back to Menu" or related options
            setCurrentOptions([
                { id: 'menu', label: '⬅️ Volver al Menú' }
            ]);
        }, 500);
    };

    const getResponseForId = (id) => {
        switch (id) {
            case 'create':
                return {
                    text: "Para publicar, ve a tu Dashboard. Si eres Freelancer, usa '+ Publicar Servicio'. Si eres Cliente, usa '+ Publicar Proyecto'.",
                    action: { label: "Ir al Dashboard", link: "/dashboard" }
                };
            case 'levels':
                return {
                    text: "Ganas 80 XP por trabajos > $100. Al subir de nivel (1 al 10), bajas tu comisión y ganas visibilidad.",
                    action: { label: "Ver Tabla de Niveles", link: "/help" }
                };
            case 'fees':
                return {
                    text: "La comisión estándar es 12%, pero baja hasta 6% si eres Nivel 10. ¡Premia tu experiencia!",
                    action: { label: "Ver Beneficios", link: "/help" }
                };
            case 'support':
                return {
                    text: "Si necesitas ayuda personalizada, escríbenos a soporte@cooplance.com o revisa el Centro de Ayuda.",
                    action: { label: "Ir al Centro de Ayuda", link: "/help" }
                };
            case 'menu':
                // Reset to main menu logic happens in handleOptionClick mostly, 
                // but if we processed "menu" id, we just greet again.
                // Actually, let's handle 'menu' specifically in handleOptionClick to reset options immediately.
                return { text: "¿En qué más puedo ayudarte?" };
            default:
                return { text: "No entiendo esa opción." };
        }
    };

    // Wrapper to handle special "Back to Menu" logic
    const handleOptionSelect = (option) => {
        if (option.id === 'menu') {
            const userMsg = { id: Date.now(), text: option.label, sender: 'user' };
            setMessages(prev => [...prev, userMsg]);
            setTimeout(() => {
                setMessages(prev => [...prev, { id: Date.now() + 1, text: "Elige una opción:", sender: 'bot' }]);
                setCurrentOptions(MAIN_MENU);
            }, 400);
        } else {
            handleOptionClick(option);
        }
    };

    const handleActionClick = (link) => {
        navigate(link);
        setIsOpen(false);
    };

    if (shouldHide) return null;

    return (
        <div className={`chatbot-container ${isOpen ? 'open' : ''}`}>
            {/* Toggle Button */}
            {!isOpen && (
                <button className="chatbot-toggle hidden md:flex" onClick={() => setIsOpen(true)} aria-label="Abrir ayuda">
                    <span className="sc-icon">
                        <svg className="bot-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </span>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="chatbot-window">
                    <div className="chatbot-header">
                        <div className="header-info">
                            <div className="bot-avatar">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="3" y="11" width="18" height="10" rx="2" stroke="white" strokeWidth="2" />
                                    <circle cx="12" cy="5" r="2" stroke="white" strokeWidth="2" />
                                    <line x1="12" y1="7" x2="12" y2="11" stroke="white" strokeWidth="2" />
                                    <line x1="8" y1="16" x2="16" y2="16" stroke="white" strokeWidth="2" />
                                </svg>
                            </div>
                            <div>
                                <h4>Soporte Cooplance</h4>
                                <span className="status-dot"></span> <span className="status-text">En línea</span>
                            </div>
                        </div>
                        <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
                    </div>

                    <div className="chatbot-messages">
                        {messages.map(msg => (
                            <div key={msg.id} className={`message ${msg.sender}`}>
                                <div className="bubble">
                                    {msg.text}
                                </div>
                                {msg.action && (
                                    <button className="action-link" onClick={() => handleActionClick(msg.action.link)}>
                                        {msg.action.label}
                                    </button>
                                )}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Options Area (Replaces Input) */}
                    <div className="chatbot-options-area">
                        {currentOptions.map(opt => (
                            <button key={opt.id} className="option-btn" onClick={() => handleOptionSelect(opt)}>
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupportChatbot;
