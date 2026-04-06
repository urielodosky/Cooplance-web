import React from 'react';
import { AlertTriangle, ExternalLink, Copy, CheckCircle2 } from 'lucide-react';

const ConfigRequired = () => {
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert(`Copiado: ${text}`);
    };

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#0a0a0c',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            fontFamily: 'Inter, system-ui, sans-serif',
            textAlign: 'center'
        }}>
            <div style={{
                maxWidth: '600px',
                backgroundColor: '#16161a',
                padding: '40px',
                borderRadius: '24px',
                border: '1px solid #333',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
            }}>
                <div style={{
                    width: '80px',
                    height: '80px',
                    backgroundColor: 'rgba(234, 179, 8, 0.1)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                    color: '#eab308'
                }}>
                    <AlertTriangle size={40} />
                </div>

                <h1 style={{ fontSize: '28px', marginBottom: '16px', fontWeight: '700' }}>
                    Configuración requerida en Vercel
                </h1>
                
                <p style={{ color: '#9ca3af', marginBottom: '32px', lineHeight: '1.6' }}>
                    La aplicación no puede conectar con Supabase porque faltan las Variables de Entorno en tu panel de Vercel. Sigue estos pasos para activarla:
                </p>

                <div style={{ textAlign: 'left', marginBottom: '32px' }}>
                    <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#1f1f23', borderRadius: '12px', border: '1px solid #2d2d33' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <code style={{ color: '#a78bfa', fontWeight: 'bold' }}>VITE_SUPABASE_URL</code>
                            <button 
                                onClick={() => copyToClipboard('VITE_SUPABASE_URL')}
                                style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}
                            >
                                <Copy size={16} />
                            </button>
                        </div>
                        <div style={{ color: '#6b7280', fontSize: '12px' }}>Cópialo en tu proyecto de Vercel &gt; Settings &gt; Environment Variables</div>
                    </div>

                    <div style={{ padding: '16px', backgroundColor: '#1f1f23', borderRadius: '12px', border: '1px solid #2d2d33' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <code style={{ color: '#a78bfa', fontWeight: 'bold' }}>VITE_SUPABASE_ANON_KEY</code>
                            <button 
                                onClick={() => copyToClipboard('VITE_SUPABASE_ANON_KEY')}
                                style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}
                            >
                                <Copy size={16} />
                            </button>
                        </div>
                        <div style={{ color: '#6b7280', fontSize: '12px' }}>Cópialo en tu proyecto de Vercel &gt; Settings &gt; Environment Variables</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <a 
                        href="https://vercel.com/dashboard" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{
                            backgroundColor: '#7c3aed',
                            color: 'white',
                            padding: '12px 24px',
                            borderRadius: '12px',
                            textDecoration: 'none',
                            fontWeight: '600',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'background 0.2s'
                        }}
                    >
                        Abrir Vercel Dashboard <ExternalLink size={18} />
                    </a>
                </div>

                <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #2d2d33', fontSize: '13px', color: '#6b7280' }}>
                    💡 Una vez añadidas las variables, ve a la pestaña "Deployments" en Vercel y haz un "Redeploy" para aplicar los cambios.
                </div>
            </div>
        </div>
    );
};

export default ConfigRequired;
