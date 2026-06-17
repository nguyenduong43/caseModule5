"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { useSearchParams } from "next/navigation";

// 🔥 1. Thêm project vào kiểu dữ liệu Task để TypeScript không bắt bẻ
type Task = {
    title: string;
    description: string;
    deadline: string;
    priority: string;
    status: string;
    project: { id: number } | null;
};

interface CreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (createdTask: any) => void;
    priorityOptions: string[];
}

export default function CreateModal({ isOpen, onClose, onSuccess, priorityOptions }: CreateModalProps) {
    const searchParams = useSearchParams();
    const projectId = searchParams.get("projectId");
    const [isDarkMode, setIsDarkMode] = useState(false);

    const [task, setTask] = useState<Task>({
        title: "",
        description: "",
        deadline: "",
        priority: "",
        status: "PENDING",
        project: null // Khởi tạo null, useEffect sẽ lo việc gán ID sau
    });

    // 🌟 Lắng nghe thay đổi Dark Mode
    useEffect(() => {
        const checkDarkMode = () => setIsDarkMode(document.documentElement.classList.contains("dark"));
        checkDarkMode();
        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => observer.disconnect();
    }, []);

    // 🌟 Đồng bộ lại projectId vào State mỗi khi Modal được mở hoặc đổi Project
    useEffect(() => {
        if (isOpen) {
            const pId = projectId ? parseInt(projectId, 10) : null;
            setTask((prev) => ({
                ...prev,
                project: pId && !isNaN(pId) ? { id: pId } : null,
                priority: priorityOptions.length > 0 ? priorityOptions[0] : prev.priority
            }));
        }
    }, [projectId, isOpen, priorityOptions]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setTask((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!task.title || !task.description || !task.deadline || !task.priority) {
            alert("Vui lòng điền đầy đủ tất cả thông tin!");
            return;
        }

        // 🔥 FIX LỖI 500: Đóng gói dữ liệu cẩn thận, tránh lỗi null/NaN gửi xuống Spring Boot
        const pId = projectId ? parseInt(projectId, 10) : null;
        const payload = {
            ...task,
            project: pId && !isNaN(pId) ? { id: pId } : null
        };

        axios
            .post("http://localhost:8080/todo", payload)
            .then((res) => {
                onSuccess(res.data);

                // Reset form giữ lại project id hiện tại cho lượt tạo sau
                setTask({
                    title: "",
                    description: "",
                    deadline: "",
                    priority: priorityOptions[0],
                    status: "PENDING",
                    project: pId && !isNaN(pId) ? { id: pId } : null
                });
                onClose();
            })
            .catch((err) => {
                console.error("Lỗi tạo mới task:", err);
                alert("Lỗi 500 từ Server. Bồ mở Console của Spring Boot lên xem báo lỗi dòng nào nhé!");
            });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            {/* 🌟 VỎ NGOÀI CỦA MODAL */}
            <div className={`rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border transition-colors duration-200 ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"}`}>

                {/* 🌟 HEADER MODAL */}
                <div className={`px-6 py-4 border-b flex justify-between items-center transition-colors duration-200 ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100"}`}>
                    <h3 className={`text-lg font-bold ${isDarkMode ? "text-slate-100" : "text-slate-800"}`}>✨ Tạo công việc mới</h3>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-red-500 text-xl font-bold transition">&times;</button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* 🌟 TIÊU ĐỀ */}
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>Tiêu đề <span className="text-red-500">*</span></label>
                        <input required type="text" name="title" value={task.title} onChange={handleChange}
                               className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-colors duration-200 ${isDarkMode ? "bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500" : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"}`}
                               placeholder="Nhập tiêu đề..." />
                    </div>

                    {/* 🌟 MÔ TẢ CHI TIẾT */}
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>Mô tả chi tiết <span className="text-red-500">*</span></label>
                        <textarea required name="description" value={task.description} onChange={handleChange} rows={3}
                                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none transition-colors duration-200 ${isDarkMode ? "bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500" : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"}`}
                                  placeholder="Nội dung cần làm..." />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* 🌟 HẠN HOÀN THÀNH */}
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>Hạn hoàn thành <span className="text-red-500">*</span></label>
                            <input required type="date" name="deadline" value={task.deadline} onChange={handleChange}
                                   className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-colors duration-200 ${isDarkMode ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-800"}`} />
                        </div>
                        {/* 🌟 ĐỘ ƯU TIÊN */}
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>Độ ưu tiên</label>
                            <select name="priority" value={task.priority} onChange={handleChange}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-colors duration-200 ${isDarkMode ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-800"}`}>
                                {priorityOptions.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* 🌟 FOOTER ACTIONS */}
                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={onClose}
                                className={`flex-1 px-4 py-2 rounded-lg transition font-medium ${isDarkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                            Hủy bỏ
                        </button>
                        <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium shadow-md shadow-indigo-500/30">
                            Tạo mới
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}