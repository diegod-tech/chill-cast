
import React from 'react'
import { AlertCircle } from 'lucide-react'

const ConfigWarning = () => {
    // Only show if Firebase API key is missing
    if (import.meta.env.VITE_FIREBASE_API_KEY) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[9999] max-w-sm bg-amber-900/90 text-amber-100 p-4 rounded-lg shadow-xl border border-amber-700 backdrop-blur-sm animate-bounce-subtle">
            <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
                <div>
                    <h3 className="font-bold text-lg mb-1">Configuration Needed</h3>
                    <p className="text-sm opacity-90 mb-3">
                        Firebase is not configured. The app is running in demo mode and features like Login, Chat, and Playback sync will not work.
                    </p>
                    <div className="text-xs bg-black/30 p-2 rounded font-mono">
                        Add VITE_FIREBASE_API_KEY to .env
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ConfigWarning
