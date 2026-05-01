import React from 'react';
import { motion } from 'framer-motion';

const FullPageLoader = ({ message = "Verificando tu conexión segura..." }) => {
    return (
        <div style={containerStyle}>
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                style={contentStyle}
            >
                {/* Security Shield Icon Animation */}
                <div style={iconContainerStyle}>
                    <motion.div
                        animate={{ 
                            scale: [1, 1.1, 1],
                            opacity: [0.5, 1, 0.5]
                        }}
                        transition={{ 
                            duration: 2, 
                            repeat: Infinity, 
                            ease: "easeInOut" 
                        }}
                        style={pulseStyle}
                    />
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                </div>

                <div style={textGroupStyle}>
                    <motion.h1 
                        style={logoTextStyle}
                        animate={{ 
                            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] 
                        }}
                        transition={{ 
                            duration: 5, 
                            repeat: Infinity, 
                            ease: "linear" 
                        }}
                    >
                        COOPLANCE
                    </motion.h1>
                    
                    <div style={loaderTrackStyle}>
                        <motion.div
                            style={loaderFillStyle}
                            animate={{ 
                                left: ["-100%", "100%"] 
                            }}
                            transition={{
                                repeat: Infinity,
                                duration: 2,
                                ease: "easeInOut"
                            }}
                        />
                    </div>

                    <p style={messageStyle}>{message}</p>
                    <motion.span 
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={subtextStyle}
                    >
                        Protegiendo tu sesión con encriptación de grado militar
                    </motion.span>
                </div>
            </motion.div>

            {/* Background elements for depth */}
            <div style={bgBlob1} />
            <div style={bgBlob2} />
        </div>
    );
};

// --- Styles ---

const containerStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: '#05070a', // Ultra dark background
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    overflow: 'hidden',
    fontFamily: '"Outfit", "Inter", sans-serif'
};

const contentStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2.5rem',
    zIndex: 10,
    padding: '2rem'
};

const iconContainerStyle = {
    position: 'relative',
    width: '80px',
    height: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(139, 92, 246, 0.05)',
    borderRadius: '24px',
    border: '1px solid rgba(139, 92, 246, 0.1)'
};

const pulseStyle = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: '24px',
    background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)',
    zIndex: -1
};

const textGroupStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem'
};

const logoTextStyle = {
    fontSize: '1.5rem',
    fontWeight: '900',
    letterSpacing: '0.5rem',
    margin: 0,
    background: 'linear-gradient(90deg, #8B5CF6, #06B6D4, #FFFFFF, #8B5CF6)',
    backgroundSize: '300% auto',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textTransform: 'uppercase'
};

const loaderTrackStyle = {
    width: '200px',
    height: '3px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '10px',
    overflow: 'hidden',
    position: 'relative',
    margin: '1rem 0'
};

const loaderFillStyle = {
    position: 'absolute',
    top: 0,
    width: '60%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, var(--primary), var(--secondary), transparent)',
};

const messageStyle = {
    fontSize: '1.1rem',
    color: '#f8fafc',
    fontWeight: '500',
    margin: 0,
    textAlign: 'center'
};

const subtextStyle = {
    fontSize: '0.75rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.15rem',
    textAlign: 'center',
    marginTop: '0.5rem'
};

const bgBlob1 = {
    position: 'absolute',
    top: '-10%',
    right: '-10%',
    width: '50vw',
    height: '50vw',
    background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)',
    zIndex: 1,
    pointerEvents: 'none'
};

const bgBlob2 = {
    position: 'absolute',
    bottom: '-10%',
    left: '-10%',
    width: '40vw',
    height: '40vw',
    background: 'radial-gradient(circle, rgba(6, 182, 212, 0.08) 0%, transparent 70%)',
    zIndex: 1,
    pointerEvents: 'none'
};

export default FullPageLoader;
