import React from 'react';
import { motion } from 'framer-motion';

const InitialLoader = () => {
    return (
        <div style={containerStyle}>
            <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={contentStyle}
            >
                <div className="logo-container" style={logoStyle}>
                    <span style={logoTextStyle}>cooplance</span>
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
                
                <motion.p 
                    style={textStyle}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                >
                    Conectando con tu entorno...
                </motion.p>
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
    gap: '24px'
};

const logoStyle = {
    background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '10px'
};

const logoTextStyle = {
    fontSize: '2.5rem',
    fontWeight: '800',
    letterSpacing: '-1px'
};

const loaderTrackStyle = {
    width: '200px',
    height: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '4px',
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
    borderRadius: '4px'
};

const textStyle = {
    color: '#94A3B8',
    fontSize: '0.9rem',
    fontWeight: '500',
    marginTop: '10px'
};

export default InitialLoader;
