import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FullPageLoader = ({ message = "Sincronizando tu espacio de trabajo..." }) => {
    return (
        <div style={containerStyle}>
            {/* Ambient Background Glows */}
            <motion.div 
                animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3] 
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                style={bgGlow1} 
            />
            <motion.div 
                animate={{ 
                    scale: [1, 1.3, 1],
                    opacity: [0.2, 0.4, 0.2] 
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                style={bgGlow2} 
            />

            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                style={cardStyle}
            >
                {/* Animated Logo / Icon Wrapper */}
                <div style={iconWrapperStyle}>
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        style={orbitStyle}
                    >
                        <div style={orbitDotStyle} />
                    </motion.div>
                    
                    <motion.div
                        animate={{ 
                            boxShadow: [
                                "0 0 20px rgba(139, 92, 246, 0.3)",
                                "0 0 40px rgba(139, 92, 246, 0.6)",
                                "0 0 20px rgba(139, 92, 246, 0.3)"
                            ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={centralIconStyle}
                    >
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                        </svg>
                    </motion.div>
                </div>

                <div style={textContainerStyle}>
                    <motion.h2 
                        style={titleStyle}
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 3, repeat: Infinity }}
                    >
                        COOPLANCE
                    </motion.h2>
                    
                    <div style={progressContainerStyle}>
                        <motion.div 
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            style={progressBarFill}
                        />
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.p 
                            key={message}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            style={messageStyle}
                        >
                            {message}
                        </motion.p>
                    </AnimatePresence>

                    <span style={footerTextStyle}>
                        Encriptación de grado bancario activa
                    </span>
                </div>
            </motion.div>

            {/* Floating Particles */}
            {[...Array(6)].map((_, i) => (
                <motion.div
                    key={i}
                    style={particleStyle(i)}
                    animate={{
                        y: [-20, 20, -20],
                        opacity: [0.1, 0.3, 0.1],
                        scale: [1, 1.2, 1]
                    }}
                    transition={{
                        duration: 3 + i,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            ))}
        </div>
    );
};

// --- Premium Styles ---

const containerStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: '#020408',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100000,
    overflow: 'hidden',
    fontFamily: '"Outfit", sans-serif'
};

const cardStyle = {
    padding: '3rem',
    borderRadius: '40px',
    background: 'rgba(255, 255, 255, 0.02)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2rem',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    zIndex: 10
};

const iconWrapperStyle = {
    position: 'relative',
    width: '120px',
    height: '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
};

const centralIconStyle = {
    width: '70px',
    height: '70px',
    borderRadius: '22px',
    background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    zIndex: 2
};

const orbitStyle = {
    position: 'absolute',
    width: '110%',
    height: '110%',
    borderRadius: '50%',
    border: '1px dashed rgba(139, 92, 246, 0.3)',
    zIndex: 1
};

const orbitDotStyle = {
    position: 'absolute',
    top: '-4px',
    left: '50%',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#8B5CF6',
    boxShadow: '0 0 10px #8B5CF6'
};

const textContainerStyle = {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
};

const titleStyle = {
    fontSize: '0.85rem',
    fontWeight: '900',
    letterSpacing: '0.6rem',
    color: 'white',
    margin: '0 0 1.5rem 0.6rem', // Offset for centering with letter spacing
    textTransform: 'uppercase',
    opacity: 0.8
};

const progressContainerStyle = {
    width: '180px',
    height: '2px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '10px',
    overflow: 'hidden',
    marginBottom: '1.5rem'
};

const progressBarFill = {
    height: '100%',
    background: 'linear-gradient(90deg, transparent, #8B5CF6, transparent)',
};

const messageStyle = {
    fontSize: '1rem',
    color: '#94a3b8',
    fontWeight: '400',
    margin: 0,
    maxWidth: '250px',
    lineHeight: '1.5'
};

const footerTextStyle = {
    fontSize: '0.65rem',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.1rem',
    marginTop: '2rem'
};

const bgGlow1 = {
    position: 'absolute',
    top: '20%',
    left: '20%',
    width: '40vw',
    height: '40vw',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
    filter: 'blur(60px)',
    zIndex: 0
};

const bgGlow2 = {
    position: 'absolute',
    bottom: '10%',
    right: '10%',
    width: '50vw',
    height: '50vw',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, transparent 70%)',
    filter: 'blur(80px)',
    zIndex: 0
};

const particleStyle = (i) => ({
    position: 'absolute',
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    backgroundColor: '#8B5CF6',
    top: `${20 + (i * 12)}%`,
    left: `${15 + (i * 15)}%`,
    filter: 'blur(1px)',
    zIndex: 1
});

export default FullPageLoader;
