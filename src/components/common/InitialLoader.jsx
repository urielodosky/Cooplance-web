import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const InitialLoader = () => {
    const [messageIndex, setMessageIndex] = useState(0);
    
    const messages = [
        { text: "Buscando los detalles del servicio...", size: '1.1rem' },
        { text: "Preparando el entorno...", size: '1.1rem' },
        { text: "Casi listo...", size: '1.1rem' }
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % messages.length);
        }, 1500);
        return () => clearInterval(interval);
    }, [messages.length]);

    return (
        <div style={containerStyle}>
            <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={contentStyle}
            >
                <div className="logo-container" style={logoStyle}>
                    <motion.span 
                        style={logoTextStyle}
                        animate={{ 
                            backgroundPosition: ["200% 50%", "0% 50%"] 
                        }}
                        transition={{ 
                            duration: 3, 
                            repeat: Infinity, 
                            ease: "linear" 
                        }}
                    >
                        cooplance
                    </motion.span>
                </div>
                
                {/* Modern subtle loading bar */}
                <div style={loaderTrackStyle}>
                    <motion.div
                        style={loaderFillStyle}
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        transition={{
                            repeat: Infinity,
                            duration: 1.5,
                            ease: "easeInOut"
                        }}
                    />
                </div>
                
                <div style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AnimatePresence mode="wait">
                        <motion.p 
                            key={messageIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.4 }}
                            style={{
                                ...textStyle,
                                fontSize: messages[messageIndex].size,
                                fontWeight: '500',
                                color: '#94A3B8'
                            }}
                        >
                            {messages[messageIndex].text}
                        </motion.p>
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

// Vanilla CSS-in-JS for isolation during critical boot
const containerStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#0A0F1C', // Deep premium dark blue
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 9999,
    fontFamily: '"Inter", sans-serif'
};

const contentStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '32px'
};

const logoStyle = {
    marginBottom: '15px'
};

const logoTextStyle = {
    fontSize: '3.5rem',
    fontWeight: '800',
    letterSpacing: '-1.5px',
    background: 'linear-gradient(90deg, #8B5CF6, #06B6D4, #FFFFFF, #8B5CF6, #06B6D4)',
    backgroundSize: '200% auto',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    display: 'inline-block'
};

const loaderTrackStyle = {
    width: '280px',
    height: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
    overflow: 'hidden',
    position: 'relative'
};

const loaderFillStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '50%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, #8B5CF6, #06B6D4, transparent)',
    borderRadius: '6px'
};

const textStyle = {
    color: '#94A3B8',
    margin: 0,
    textAlign: 'center'
};


export default InitialLoader;

