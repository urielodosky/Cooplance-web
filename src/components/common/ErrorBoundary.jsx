import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught Error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    }

    handleClearCache = () => {
        localStorage.clear();
        window.location.reload();
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div style={{
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#0f172a',
                    color: '#e2e8f0',
                    fontFamily: 'sans-serif',
                    padding: '2rem',
                    textAlign: 'center'
                }}>
                    <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#ef4444' }}>¡Ups! Algo salió mal.</h2>
                    <p style={{ maxWidth: '600px', marginBottom: '1rem', lineHeight: '1.6' }}>
                        La aplicación encontró un error inesperado que impide continuar.
                    </p>

                    <div style={{
                        background: 'rgba(0,0,0,0.3)',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        textAlign: 'left',
                        marginBottom: '2rem',
                        maxWidth: '800px',
                        width: '100%',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        overflow: 'auto',
                        maxHeight: '300px'
                    }}>
                        <p style={{ color: '#ef4444', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>Detalles Técnicos:</p>
                        <code style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', whiteSpace: 'pre-wrap' }}>
                            {this.state.error && this.state.error.toString()}
                            {"\n\n"}
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </code>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button
                            onClick={this.handleReload}
                            style={{
                                padding: '0.75rem 1.5rem',
                                background: '#6366f1',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            Recargar Página
                        </button>

                        <button
                            onClick={this.handleClearCache}
                            style={{
                                padding: '0.75rem 1.5rem',
                                background: 'transparent',
                                border: '1px solid #475569',
                                color: '#94a3b8',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            Restablecer App (Borrar Datos)
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
