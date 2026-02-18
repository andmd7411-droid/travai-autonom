import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Delete } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import '../styles/LockScreen.css';

interface LockScreenProps {
    onUnlock: () => void;
}

const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
    const { t } = useLanguage();
    const [pin, setPin] = useState('');
    const [savedPin, setSavedPin] = useState<string | null>(() => localStorage.getItem('userPin'));
    const [headerText, setHeaderText] = useState(''); // Derived state for display
    const [error, setError] = useState('');

    useEffect(() => {
        const storedPin = localStorage.getItem('userPin');
        if (!storedPin) {
            // Default PIN 0000 logic
            if (localStorage.getItem('pinInitialized') !== 'true') {
                localStorage.setItem('userPin', '0000');
                localStorage.setItem('pinInitialized', 'true');
                setSavedPin('0000');
            }
        }
    }, []);

    // Simple display logic
    useEffect(() => {
        setHeaderText(t.enterPin);
    }, [t]);

    const handleNumberClick = (num: string) => {
        setError('');
        if (pin.length < 4) {
            const newPin = pin + num;
            setPin(newPin);

            // Auto submit on 4th digit
            if (newPin.length === 4) {
                setTimeout(() => validatePin(newPin), 300);
            }
        }
    };

    const handleDelete = () => {
        setPin(pin.slice(0, -1));
        setError('');
    };

    const validatePin = (inputPin: string) => {
        if (inputPin === savedPin) {
            onUnlock();
        } else {
            setError(t.wrongPin);
            setPin('');
        }
    };

    // Note: Changing PIN logic could be added here or in a settings page. 
    // For now this component is primarily for the startup lock.

    return (
        <div className="lock-screen-container">
            <motion.div
                className="lock-pad glass-panel"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
            >
                <div className="lock-icon">
                    <Lock size={48} color="var(--color-primary)" />
                </div>

                <h2>{headerText}</h2>

                <div className="pin-display">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''} ${error ? 'error' : ''}`} />
                    ))}
                </div>

                {error && <p className="error-message">{error}</p>}

                <div className="number-pad">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button key={num} onClick={() => handleNumberClick(num.toString())}>
                            {num}
                        </button>
                    ))}
                    <div className="empty-slot"></div>
                    <button onClick={() => handleNumberClick('0')}>0</button>
                    <button onClick={handleDelete} className="delete-btn" title={t.cancel} aria-label={t.cancel}>
                        <Delete size={24} />
                    </button>
                </div>

                <div className="forgot-pin">
                    <small>{t.forgotPin}</small>
                </div>
            </motion.div>
        </div>
    );
};

export default LockScreen;
