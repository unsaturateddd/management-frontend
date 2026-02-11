import { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:7140/api/Projects';

export default function App() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [projectData, setProjectData] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [versionFiles, setVersionFiles] = useState<string[]>([]);

  // --- ХЕЛПЕРЫ ---
  const loadProjects = () => {
    axios.get(API_URL).then(res => setProjects(res.data)).catch(console.error);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '---';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  useEffect(() => { loadProjects(); }, []);

  // --- ЛОГИКА ПРОЕКТОВ ---
  const openProject = async (id: string) => {
    try {
      const res = await axios.get(`${API_URL}/${id}`);
      setProjectData(res.data);
      setSelectedId(id);
    } catch (e) { alert("Ошибка при открытии проекта"); }
  };

  const createProject = async () => {
    if (!newProjectName) return;
    await axios.post(API_URL, { name: newProjectName, projectType: 'Application' });
    setIsModalOpen(false);
    setNewProjectName('');
    loadProjects();
  };

  const deleteProject = async () => {
    if (!window.confirm("Удалить проект навсегда? Это действие необратимо.")) return;
    try {
      await axios.delete(`${API_URL}/${selectedId}`);
      setSelectedId(null);
      setProjectData(null);
      loadProjects();
    } catch (e) { alert("Ошибка удаления. Возможно, в проекте есть связанные данные."); }
  };

  // --- ЛОГИКА ВЕРСИЙ ---
  const createVersion = async () => {
    const vNum = prompt("Введите версию (напр. 1.0.0):");
    if (!vNum) return;
    await axios.post(`${API_URL}/${selectedId}/versions`, { versionNumber: vNum });
    openProject(selectedId!);
  };

  const setStatus = async (versionId: string, status: string) => {
    try {
      await axios.post(`${API_URL}/versions/${versionId}/rounds`, JSON.stringify(status), {
        headers: { 'Content-Type': 'application/json' }
      });
      openProject(selectedId!);
    } catch (e) { console.error(e); }
  };

  const loadFiles = async (versionId: string) => {
    if (expandedVersion === versionId) {
      setExpandedVersion(null);
      return;
    }
    const res = await axios.get(`${API_URL}/versions/${versionId}/files`);
    setVersionFiles(res.data);
    setExpandedVersion(versionId);
  };

  const uploadFile = async (versionId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    await axios.post(`${API_URL}/versions/${versionId}/upload`, formData);
    if (expandedVersion === versionId) loadFiles(versionId);
    alert("Файл загружен!");
  };

  // --- ЭКРАН: ДЕТАЛИ ---
  if (selectedId && projectData) {
    const { project, versions } = projectData;

    return (
      <div className="app-container">
        <div className="header">
          <button className="btn btn-secondary btn-sm" onClick={() => setSelectedId(null)}>← Назад</button>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{project.name}</div>
            <div style={{ color: 'var(--text-dim)', fontSize: '13px', marginTop: '4px' }}>
              {project.projectType} • {versions.length} билдов 
              <button className="btn btn-danger btn-sm" onClick={deleteProject}>Удалить проект</button>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <button className="btn btn-primary" onClick={createVersion}>+ Добавить билд</button>
        </div>

        <div className="version-list">
          {versions.map((v: any) => (
            <div key={v.id} className="version-item">
              <div className="version-header">
                <div>
                  <span className="version-title">v{v.versionNumber}</span>
                  <span className="version-date">{formatDate(v.createdAt)}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {['DEV', 'STAGE', 'PROD'].map(st => (
                    <span 
                      key={st} 
                      className={`status-tag ${v.workRounds?.some((r: any) => r.name === st) ? 'active' : ''}`}
                      onClick={() => setStatus(v.id, st)}
                    >
                      {st}
                    </span>
                  ))}
                  <label className="btn btn-secondary btn-sm" style={{marginLeft: '8px'}}>
                    Upload
                    <input type="file" hidden onChange={e => e.target.files?.[0] && uploadFile(v.id, e.target.files[0])} />
                  </label>
                  <button className="btn btn-secondary btn-sm" onClick={() => loadFiles(v.id)}>
                    Files {expandedVersion === v.id ? '▲' : '▼'}
                  </button>
                </div>
              </div>
              
              {expandedVersion === v.id && (
                <div className="file-area">
                  {versionFiles.length > 0 ? versionFiles.map(f => (
                    <div key={f} className="file-row">
                      <span>{f}</span>
                      <a href={`${API_URL}/versions/${v.id}/download/${f}`} style={{color: 'var(--accent-blue)', textDecoration: 'none'}}>Скачать</a>
                    </div>
                  )) : <div style={{color: '#444', fontSize: '12px'}}>Папка пуста</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- ЭКРАН: ГЛАВНЫЙ ---
  return (
    <div className="app-container">
      <div className="header">
        <div className="logo">Management<span>Version</span></div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>Создать проект</button>
      </div>

      <div className="grid">
        {projects.map((p: any) => (
          <div key={p.id} className="card" onClick={() => openProject(p.id)}>
            <h3>{p.name}</h3>
            <p>{p.projectType || 'Standard Application'}</p>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2 style={{ margin: 0, fontSize: '20px' }}>Новый проект</h2>
            <input 
              className="input" 
              placeholder="Название проекта..." 
              autoFocus 
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={createProject}>Создать</button>
              <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setIsModalOpen(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
