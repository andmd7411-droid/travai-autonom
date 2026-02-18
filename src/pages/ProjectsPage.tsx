import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Plus, Edit2, Trash2, LayoutGrid, List as ListIcon } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency } from '../utils/format';
import type { Project } from '../types';
import '../styles/global.css'; // Utilizing global styles for glassmorphism

const ProjectsPage: React.FC = () => {
    const { t } = useLanguage();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);

    // Queries
    const projects = useLiveQuery(() => db.projects.toArray());
    const clients = useLiveQuery(() => db.clients.toArray());
    const sessions = useLiveQuery(() => db.workSessions.toArray());

    const [formData, setFormData] = useState<Partial<Project>>({
        name: '',
        clientId: undefined,
        status: 'active',
        color: '#3B82F6',
        hourlyRate: undefined,
        description: ''
    });

    const handleCreate = () => {
        setEditingProject(null);
        setFormData({
            name: '',
            clientId: undefined,
            status: 'active',
            color: '#3B82F6',
            hourlyRate: undefined,
            description: ''
        });
        setIsModalOpen(true);
    };

    const handleEdit = (project: Project) => {
        setEditingProject(project);
        setFormData(project);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (confirm(t.confirmDeleteProject)) {
            await db.projects.delete(id);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingProject && editingProject.id) {
                await db.projects.update(editingProject.id, formData);
            } else {
                await db.projects.add(formData as Project);
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Failed to save project:", error);
        }
    };

    // Calculate stats per project
    const getProjectStats = (projectId: number) => {
        if (!sessions) return { hours: 0, income: 0 };
        const projectSessions = sessions.filter(s => s.projectId === projectId);
        const income = projectSessions.reduce((acc, s) => acc + (s.totalEarned || 0), 0);
        const hours = projectSessions.reduce((acc, s) => acc + (s.duration || 0), 0) / 3600000;
        return { income, hours };
    };

    return (
        <div className="page-container projects-page">
            <div className="page-header">
                <div>
                    <h2>{t.projects || "Projects"}</h2>
                    <p className="subtitle">{projects?.length || 0} {t.activeProjects || "Active Projects"}</p>
                </div>
                <div className="header-actions">
                    <div className="view-toggle glass-panel">
                        <button
                            className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                        >
                            <ListIcon size={18} />
                        </button>
                    </div>
                    <button onClick={handleCreate} className="btn-primary">
                        <Plus size={18} /> {t.addProject || "New Project"}
                    </button>
                </div>
            </div>

            <div className={`projects-grid ${viewMode}`}>
                {projects?.map(project => {
                    const stats = getProjectStats(project.id!);
                    const clientName = clients?.find(c => c.id === project.clientId)?.name;

                    return (
                        <div key={project.id} className="project-card glass-panel" style={{ borderLeft: `4px solid ${project.color}` }}>
                            <div className="card-header clickable" onClick={() => window.location.hash = `#/projects/${project.id}`}>
                                <h3 className="no-pointer-events">{project.name}</h3>
                                <span className={`status-badge ${project.status}`}>{project.status}</span>
                            </div>

                            {clientName && <p className="client-name">{clientName}</p>}

                            <div className="card-stats">
                                <div className="stat">
                                    <span className="label">{t.hours || "Hours"}</span>
                                    <span className="value">{stats.hours.toFixed(1)}h</span>
                                </div>
                                <div className="stat">
                                    <span className="label">{t.income || "Income"}</span>
                                    <span className="value">{formatCurrency(stats.income)}</span>
                                </div>
                            </div>

                            <div className="card-actions">
                                <button onClick={() => handleEdit(project)} className="action-btn edit">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDelete(project.id!)} className="action-btn delete">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content glass-panel">
                        <h3>{editingProject ? (t.editProject || "Edit Project") : (t.newProject || "New Project")}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>{t.profileName || "Name"}</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    title={t.profileName}
                                    placeholder={t.profileName}
                                />
                            </div>

                            <div className="form-group">
                                <label>{t.clients || "Client"}</label>
                                <select
                                    value={formData.clientId || ''}
                                    onChange={e => setFormData({ ...formData, clientId: Number(e.target.value) || undefined })}
                                    title={t.clients}
                                >
                                    <option value="">{t.select || "Select Client..."}</option>
                                    {clients?.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>{t.status || "Status"}</label>
                                <select
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                    title={t.status}
                                >
                                    <option value="active">Active</option>
                                    <option value="completed">Completed</option>
                                    <option value="archived">Archived</option>
                                </select>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>{t.color || "Color"}</label>
                                    <input
                                        type="color"
                                        value={formData.color}
                                        onChange={e => setFormData({ ...formData, color: e.target.value })}
                                        title={t.color}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>{t.hourlyRate || "Hourly Rate"}</label>
                                    <input
                                        type="number"
                                        value={formData.hourlyRate || ''}
                                        onChange={e => setFormData({ ...formData, hourlyRate: Number(e.target.value) })}
                                        placeholder="Optional override"
                                        title={t.hourlyRate}
                                    />
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
                                    {t.cancel}
                                </button>
                                <button type="submit" className="btn-primary">
                                    {t.save}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectsPage;
