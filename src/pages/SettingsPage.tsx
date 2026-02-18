import { useState } from 'react';
import { Shield, Lock, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import '../styles/SettingsPage.css';

const SettingsPage = () => {
    const { t } = useLanguage();
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSavePin = (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        const storedPin = localStorage.getItem('userPin') || '0000';

        if (currentPin !== storedPin) {
            setMessage({ type: 'error', text: t.wrongPin });
            return;
        }

        if (newPin.length < 4) {
            setMessage({ type: 'error', text: t.pinTooShort });
            return;
        }

        if (newPin !== confirmPin) {
            setMessage({ type: 'error', text: t.pinMismatch });
            return;
        }

        localStorage.setItem('userPin', newPin);
        setMessage({ type: 'success', text: t.pinSaved });
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
    };

    return (
        <div className="page-container settings-page">
            <h2>{t.settings}</h2>

            <div className="settings-section glass-panel">
                <div className="section-header">
                    <Shield size={24} className="icon-shield" />
                    <h3>{t.security}</h3>
                </div>

                <form onSubmit={handleSavePin} className="pin-form">
                    <h4>{t.changePin}</h4>

                    <div className="form-group">
                        <label>{t.currentPin}</label>
                        <div className="input-with-icon">
                            <Lock size={18} />
                            <input
                                type="password"
                                value={currentPin}
                                onChange={(e) => setCurrentPin(e.target.value)}
                                placeholder="****"
                                pattern="\d*"
                                inputMode="numeric"
                                maxLength={8}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>{t.newPin}</label>
                        <div className="input-with-icon">
                            <Lock size={18} />
                            <input
                                type="password"
                                value={newPin}
                                onChange={(e) => setNewPin(e.target.value)}
                                placeholder="****"
                                pattern="\d*"
                                inputMode="numeric"
                                maxLength={8}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>{t.confirmPin}</label>
                        <div className="input-with-icon">
                            <Lock size={18} />
                            <input
                                type="password"
                                value={confirmPin}
                                onChange={(e) => setConfirmPin(e.target.value)}
                                placeholder="****"
                                pattern="\d*"
                                inputMode="numeric"
                                maxLength={8}
                            />
                        </div>
                    </div>

                    {message && (
                        <div className={`message ${message.type}`}>
                            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                            <span>{message.text}</span>
                        </div>
                    )}

                    <button type="submit" className="save-btn">
                        <Save size={18} />
                        <span>{t.updatePin}</span>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SettingsPage;
