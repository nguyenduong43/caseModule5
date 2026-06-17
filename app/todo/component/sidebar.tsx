"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";

// Định nghĩa cấu trúc chuẩn từ DB
type IconType = {
    id: number;
    name: string;
    value: string;
};

type Project = {
    id: number;
    name: string;
    icon: IconType | null;
};

export default function Sidebar() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [icons, setIcons] = useState<IconType[]>([]);

    // State cho Modal Tạo mới
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");
    const [selectedIcon, setSelectedIcon] = useState<IconType | null>(null);

    // 🌟 State cho Modal Chỉnh sửa độc lập
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [editProjectName, setEditProjectName] = useState("");
    const [editSelectedIcon, setEditSelectedIcon] = useState<IconType | null>(null);

    const [isDarkMode, setIsDarkMode] = useState(false);
    const [validationError, setValidationError] = useState("");
    const [editValidationError, setEditValidationError] = useState("");
    const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

    const router = useRouter();
    const searchParams = useSearchParams();
    const currentProjectId = searchParams.get("projectId");

    // Lấy danh sách Icon từ DB ngay khi Sidebar vừa được tải (Quan trọng: load trước để có data so sánh)
    const fetchIcons = () => {
        axios
            .get("http://localhost:8080/icons")
            .then((res) => {
                setIcons(res.data);
                if (res.data.length > 0 && !selectedIcon) {
                    setSelectedIcon(res.data[0]);
                }
            })
            .catch((err) => console.error("Lỗi lấy danh sách icon:", err));
    };

    const fetchProjects = () => {
        axios
            .get("http://localhost:8080/project")
            .then((res) => {
                if (Array.isArray(res.data)) {
                    setProjects(res.data);
                }
            })
            .catch((err) => console.error("Lỗi lấy danh sách dự án:", err));
    };

    useEffect(() => {
        fetchProjects();
        fetchIcons(); // Chạy ngay từ đầu để sẵn sàng dữ liệu icon
    }, []);

    // Theo dõi darkmode
    useEffect(() => {
        const checkDarkMode = () => setIsDarkMode(document.documentElement.classList.contains("dark"));
        checkDarkMode();
        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => observer.disconnect();
    }, []);

    const handleSelectProject = (id: number | null) => {
        // 1. Cập nhật thứ tự hiển thị ở Sidebar (đẩy lên đầu)
        if (id !== null) {
            setProjects((prev) => {
                const clickedProject = prev.find(p => p.id === id);
                const others = prev.filter(p => p.id !== id);
                return clickedProject ? [clickedProject, ...others] : prev;
            });
        }

        // 2. Chuyển trang
        if (id === null) router.push("/todo");
        else router.push(`/todo?projectId=${id}`);
    };

    const handleCreateProject = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectName.trim()) {
            setValidationError("Vui lòng không để trống tên dự án!");
            return;
        }

        axios
            .post("http://localhost:8080/project", {
                name: newProjectName,
                icon: selectedIcon ? { id: selectedIcon.id } : null
            })
            .then((res) => {
                setProjects((prev) => [...prev, res.data]);
                setNewProjectName("");
                if (icons.length > 0) setSelectedIcon(icons[0]);
                setValidationError("");
                setIsModalOpen(false);
            })
            .catch(() => setValidationError("Có lỗi xảy ra từ máy chủ khi tạo mới."));
        window.dispatchEvent(new CustomEvent("project-updated-signal"));
    };
    useEffect(() => {
        const handleRefreshProjects = () => {
            fetchProjects(); // Tải lại danh sách dự án tại KanbanBoard để đồng bộ Icon và Tên lên Header
        };

        window.addEventListener("project-updated-signal", handleRefreshProjects);
        return () => {
            window.removeEventListener("project-updated-signal", handleRefreshProjects);
        };
    }, []);
    // 🌟 HÀM MỞ MODAL SỬA: Tìm chính xác object Icon trong mảng icons để gán vào State
    const openEditModal = (project: Project, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingProject(project);
        setEditProjectName(project.name);

        // Tìm đúng icon trùng ID trong danh sách đã load từ DB để React nhận diện được reference
        const currentIcon = icons.find(ico => ico.id === project.icon?.id);
        setEditSelectedIcon(currentIcon || null);

        setEditValidationError("");
        setIsEditModalOpen(true);
    };

    // 🌟 HÀM CẬP NHẬT: Thay đổi state cục bộ của Sidebar + Bắn tín hiệu ra Header
    const handleUpdateProject = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProject) return;
        if (!editProjectName.trim()) {
            setEditValidationError("Vui lòng không để trống tên dự án!");
            return;
        }

        axios
            .put(`http://localhost:8080/project/${editingProject.id}`, {
                name: editProjectName,
                icon: editSelectedIcon ? { id: editSelectedIcon.id } : null
            })
            .then((res) => {
                // 1. Cập nhật mảng projects ngay tại Sidebar lập tức (Ăn icon mới luôn không cần F5)
                setProjects((prev) =>
                    prev.map((p) => (p.id === editingProject.id ? res.data : p))
                );

                // 2. Bắn tín hiệu ra cho KanbanBoard cập nhật Header theo
                window.dispatchEvent(new CustomEvent("project-updated-signal"));

                // Reset state đóng modal
                setEditingProject(null);
                setEditProjectName("");
                setEditSelectedIcon(null);
                setIsEditModalOpen(false);
            })
            .catch(() => setEditValidationError("Có lỗi xảy ra khi cập nhật dự án."));
    };

    const openDeleteConfirm = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteTargetId(id);
    };

    const handleConfirmDelete = () => {
        if (deleteTargetId === null) return;
        axios.delete(`http://localhost:8080/project/${deleteTargetId}`).then(() => {
            setProjects((prev) => prev.filter((p) => p.id !== deleteTargetId));
            if (currentProjectId === deleteTargetId.toString()) router.push("/todo");
            setDeleteTargetId(null);
        });
    };
    // 🌟 THÊM ĐOẠN NÀY VÀO TRONG FILE Sidebar.tsx ĐỂ NÓ TỰ FETCH LẠI KHI CÓ LỆNH UPDATE
    useEffect(() => {
        const handleRefreshSidebar = () => {
            fetchProjects(); // Tải lại danh sách dự án tại Sidebar để cập nhật Icon lập tức
        };

        // Lắng nghe tín hiệu update (do chính nó hoặc nơi khác phát ra)
        window.addEventListener("project-updated-signal", handleRefreshSidebar);

        return () => {
            window.removeEventListener("project-updated-signal", handleRefreshSidebar);
        };
    }, []);
    return (
        <div className={`w-64 p-4 border-r h-screen flex flex-col gap-2 flex-shrink-0 transition-colors duration-300 ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>

            {/* Header Workspace */}
            <div className={`p-4 border-b flex items-center gap-3 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md">📊</div>
                <div>
                    <h2 className={`font-bold text-sm leading-tight ${isDarkMode ? "text-white" : "text-slate-800"}`}>Pro Kanban</h2>
                    <span className={`text-[10px] font-medium ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>Workspace</span>
                </div>
            </div>

            {/* Tiêu đề mục Bảng */}
            <div className="flex justify-between items-center px-3 mb-2 pt-2">
                <h2 className={`font-bold flex items-center gap-2 text-lg ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>📁 Bảng</h2>
                <button onClick={() => setIsModalOpen(true)} className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold transition text-lg ${isDarkMode ? "bg-slate-800 text-indigo-400" : "bg-indigo-50 text-indigo-600"}`}>
                    ➕
                </button>
            </div>

            {/* Danh sách các nút Dự án động */}
            <div className="flex flex-col gap-1 overflow-y-auto transition-all flex-1 pr-1 scrollbar-none">
                {projects.map((project) => {
                    const isActive = currentProjectId === project.id.toString();
                    return (
                        <div key={project.id} className={`group w-full flex items-center justify-between pr-2 rounded-xl transition-all ${isActive ? (isDarkMode ? "bg-indigo-950/40 border-l-4 border-indigo-500 rounded-l-none" : "bg-indigo-50 border-l-4 border-indigo-500 rounded-l-none") : (isDarkMode ? "hover:bg-slate-800/60" : "hover:bg-slate-100")}`}>
                            <button onClick={() => handleSelectProject(project.id)} className={`flex-1 text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2.5 truncate rounded-xl ${isActive ? "text-indigo-600 dark:text-indigo-400 font-semibold" : "text-slate-600 dark:text-slate-400"}`}>
                                <span className="text-base flex-shrink-0 select-none">
                                    {project.icon ? project.icon.value : "📁"}
                                </span>
                                <span className="truncate">{project.name}</span>
                            </button>

                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                                {/* Nút sửa dự án */}
                                <button onClick={(e) => openEditModal(project, e)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500">✏️</button>
                                {/* Nút xóa dự án */}
                                <button onClick={(e) => openDeleteConfirm(project.id, e)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500">🗑️</button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* MODAL TẠO MỚI */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
                    <div className={`rounded-2xl shadow-xl w-full max-w-sm p-6 border ${isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-800"}`}>
                        <h3 className="text-md font-bold mb-4 text-indigo-500">➕ Tạo dự án mới</h3>
                        <form onSubmit={handleCreateProject} className="space-y-4">

                            {/* Ô Nhập Tên: Dùng inline style ép màu */}
                            <input
                                required
                                type="text"
                                value={newProjectName}
                                onChange={e => setNewProjectName(e.target.value)}
                                className="w-full px-3 py-2 border rounded-xl text-sm outline-none font-medium"
                                style={isDarkMode ? { backgroundColor: '#1e293b', color: '#ffffff', borderColor: '#334155' } : { backgroundColor: '#ffffff', color: '#1e293b', borderColor: '#e2e8f0' }}
                                placeholder="Nhập tên dự án..."
                            />

                            {/* Khung Chứa Icon */}
                            <div className="grid grid-cols-6 gap-2 max-h-28 overflow-y-auto p-1.5 border rounded-xl"
                                 style={isDarkMode ? { backgroundColor: '#0f172a', borderColor: '#334155' } : { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                                {icons.map((ico) => {
                                    const isSelected = selectedIcon?.id === ico.id;
                                    return (
                                        <button
                                            key={ico.id}
                                            type="button"
                                            onClick={() => setSelectedIcon(ico)}
                                            className={`w-9 h-9 flex items-center justify-center text-xl rounded-lg border transition-all ${isSelected ? "bg-indigo-600 border-indigo-600 text-white shadow-md scale-110" : ""}`}
                                            style={!isSelected ? (isDarkMode ? { backgroundColor: '#1e293b', borderColor: '#334155' } : { backgroundColor: '#ffffff', borderColor: '#cbd5e1' }) : {}}
                                        >
                                            {ico.value}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Nút bấm */}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2 rounded-xl text-sm font-medium transition"
                                    style={isDarkMode ? { backgroundColor: '#1e293b', color: '#e2e8f0' } : { backgroundColor: '#f1f5f9', color: '#334155' }}
                                >
                                    Hủy
                                </button>
                                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium shadow-md shadow-indigo-500/20">Tạo mới</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ==================== MODAL SỬA DỰ ÁN ==================== */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
                    <div className={`rounded-2xl shadow-xl w-full max-w-sm p-6 border ${isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-800"}`}>
                        <h3 className="text-md font-bold mb-4 text-amber-500">✏️ Chỉnh sửa dự án</h3>
                        <form onSubmit={handleUpdateProject} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold mb-1 opacity-60">TÊN DỰ ÁN</label>
                                {/* Ô nhập liệu sửa tên */}
                                <input
                                    required
                                    type="text"
                                    value={editProjectName}
                                    onChange={e => setEditProjectName(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-xl text-sm outline-none font-medium"
                                    style={isDarkMode ? { backgroundColor: '#1e293b', color: '#ffffff', borderColor: '#334155' } : { backgroundColor: '#ffffff', color: '#1e293b', borderColor: '#e2e8f0' }}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold mb-1.5 opacity-60">CHỌN ICON ĐẠI DIỆN</label>
                                {/* Khung Chứa Icon sửa */}
                                <div className="grid grid-cols-6 gap-2 max-h-28 overflow-y-auto p-1.5 border rounded-xl"
                                     style={isDarkMode ? { backgroundColor: '#0f172a', borderColor: '#334155' } : { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                                    {icons.map((ico) => {
                                        const isSelected = editSelectedIcon?.id === ico.id;
                                        return (
                                            <button
                                                key={ico.id}
                                                type="button"
                                                onClick={() => setEditSelectedIcon(ico)}
                                                className={`w-9 h-9 flex items-center justify-center text-xl rounded-lg transition-all border ${isSelected ? "bg-amber-500 border-amber-500 text-white shadow-md scale-110" : ""}`}
                                                style={!isSelected ? (isDarkMode ? { backgroundColor: '#1e293b', borderColor: '#334155' } : { backgroundColor: '#ffffff', borderColor: '#cbd5e1' }) : {}}
                                            >
                                                {ico.value}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Nút bấm */}
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 py-2 rounded-xl text-sm font-medium transition"
                                    style={isDarkMode ? { backgroundColor: '#1e293b', color: '#e2e8f0' } : { backgroundColor: '#f1f5f9', color: '#334155' }}
                                >
                                    Hủy
                                </button>
                                <button type="submit" className="flex-1 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium shadow-md shadow-amber-500/20">Cập nhật</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ==================== MODAL XÓA DỰ ÁN ==================== */}
            {deleteTargetId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
                    <div className={`rounded-2xl shadow-xl w-full max-w-sm p-6 border ${isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-800"}`}>
                        <h3 className="text-base font-bold mb-1">⚠️ Xác nhận xóa dự án?</h3>
                        <p className="text-xs mb-5 opacity-70">Hành động này sẽ xóa toàn bộ Task bên trong dự án vĩnh viễn.</p>
                        <div className="flex gap-2.5">
                            {/* Nút Quay Lại của Modal Xóa */}
                            <button
                                type="button"
                                onClick={() => setDeleteTargetId(null)}
                                className="flex-1 py-2 rounded-xl text-sm font-medium transition"
                                style={isDarkMode ? { backgroundColor: '#1e293b', color: '#e2e8f0' } : { backgroundColor: '#f1f5f9', color: '#334155' }}
                            >
                                Quay lại
                            </button>
                            <button type="button" onClick={handleConfirmDelete} className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-medium shadow-md shadow-red-500/20">Đồng ý xóa</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}