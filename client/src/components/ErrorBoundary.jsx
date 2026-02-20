import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-red-900 text-white p-10 flex flex-col items-center justify-center">
                    <h1 className="text-4xl font-bold mb-4">⚠️ Something went wrong.</h1>
                    <div className="bg-black p-4 rounded border border-red-500 max-w-2xl overflow-auto">
                        <p className="font-mono text-red-300 font-bold mb-2">{this.state.error && this.state.error.toString()}</p>
                        <p className="text-gray-500 text-xs mb-2">Time: {new Date().toLocaleTimeString()}</p>
                        <pre className="text-xs text-gray-400">{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-6 py-3 bg-white text-red-900 font-bold rounded hover:bg-gray-200"
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
