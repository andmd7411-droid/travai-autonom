import { useState } from 'react';
import { Shield, Lock, Save, CheckCircle, AlertCircle, Briefcase, Database, Download, Upload } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { exportData, importData } from '../utils/backup';
import '../styles/SettingsPage.css';

const SettingsPage = () => {
    const { t } = useLanguage();

    const [companyProfile, setCompanyProfile] = useState(() => {
        const saved = localStorage.getItem('companyProfile');
        return saved ? JSON.parse(saved) : {
            name: '',
            address: '',
            phone: '',
            email: '',
            taxId: '',
            logoUrl: ''
        };
    });

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

    const handleSaveProfile = (e: React.FormEvent) => {
        e.preventDefault();
        localStorage.setItem('companyProfile', JSON.stringify(companyProfile));
        setMessage({ type: 'success', text: t.profileSaved });
    };

    const handleExport = async () => {
        try {
            await exportData();
            setMessage({ type: 'success', text: t.backupSuccess });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Export failed' });
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (confirm(t.restoreNote)) {
            try {
                await importData(file);
                alert(t.restoreSuccess);
                window.location.reload();
            } catch (error) {
                console.error(error);
                setMessage({ type: 'error', text: t.restoreError });
            }
        }
        // Reset input
        e.target.value = '';
    };

    return (
        <div className="page-container settings-page">
            <h2>{t.settings}</h2>

            <div className="settings-grid">
                {/* Security Section */}
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

                        <button type="submit" className="save-btn">
                            <Save size={18} />
                            <span>{t.updatePin}</span>
                        </button>
                    </form>
                </div>

                {/* Company Profile Section */}
                <div className="settings-section glass-panel">
                    <div className="section-header">
                        <Briefcase size={24} className="icon-profile" />
                        <h3>{t.companyProfile}</h3>
                    </div>
                    <form onSubmit={handleSaveProfile} className="profile-form">
                        <div className="form-group">
                            <label>{t.profileName}</label>
                            <input
                                type="text"
                                value={companyProfile.name}
                                onChange={e => setCompanyProfile({ ...companyProfile, name: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>{t.profileAddress}</label>
                            <input
                                type="text"
                                value={companyProfile.address}
                                onChange={e => setCompanyProfile({ ...companyProfile, address: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>{t.profilePhone}</label>
                            <input
                                type="text"
                                value={companyProfile.phone}
                                onChange={e => setCompanyProfile({ ...companyProfile, phone: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>{t.profileEmail}</label>
                            <input
                                type="email"
                                value={companyProfile.email}
                                onChange={e => setCompanyProfile({ ...companyProfile, email: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>{t.profileTaxId}</label>
                            <input
                                type="text"
                                value={companyProfile.taxId}
                                onChange={e => setCompanyProfile({ ...companyProfile, taxId: e.target.value })}
                            />
                        </div>
                        <button type="submit" className="save-btn">
                            <Save size={18} />
                            <span>{t.saveProfile}</span>
                        </button>
                    </form>
                </div>

                {/* Data Management Section */}
                <div className="settings-section glass-panel">
                    <div className="section-header">
                        <Database size={24} className="icon-data" />
                        <h3>{t.dataManagement}</h3>
                    </div>
                    <div className="data-actions">
                        <div className="data-action-item">
                            <p>{t.backupNote}</p>
                            <button onClick={handleExport} className="export-btn">
                                <Download size={18} />
                                <span>{t.exportBackup}</span>
                            </button>
                        </div>
                        <div className="data-action-item">
                            <p className="warning-text">{t.restoreNote}</p>
                            <label className="import-btn">
                                <Upload size={18} />
                                <span>{t.importBackup}</span>
                                <input type="file" accept=".json" onChange={handleImport} hidden />
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {message && (
                <div className={`message-toast ${message.type}`}>
                    {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    <span>{message.text}</span>
                </div>
            )}
            {/* App Version */}
            <div className="app-version glass-panel" style={{ textAlign: 'center', marginTop: '2rem', padding: '1rem', color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                <p>App Version: 0.1.4</p>
                <p>Build Time: {new Date().toLocaleString()}</p>
            </div>
        </div>
    );
};

export default SettingsPage;
