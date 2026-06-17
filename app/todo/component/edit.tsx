"use client"
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import axios from "axios";

type Task = {
    id: number;
    title: string;
    description: string;
    deadline: string;
    priority: string;
    status: string;
}

interface EditModalProps {
    isOpen: boolean;
    taskData: Task | null;
    onClose: () => void;
    onSuccess: (actionType?: "update" | "delete") => void;
}

export default function EditModal({ isOpen, taskData, onClose, onSuccess }: EditModalProps) {
    const [task, setTask] = useState<Task>({
        id: 0, title: "", description: "", deadline: "", priority: "", status: "PENDING"
    });
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        // Đồng bộ DarkMode khi mở modal
        const checkTheme = () => setIsDarkMode(document.documentElement.classList.contains("dark"));
        checkTheme();

        if (taskData) {
            let data = { ...taskData };
            if (data.deadline && data.deadline.includes("T")) {
                data.deadline = data.deadline.split("T")[0];
            }
            setTask(data);
            setShowConfirmDelete(false);
        }
    }, [taskData]);

    if (!isOpen) return null;

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        axios
            .put(`http://localhost:8080/todo/${task.id}`, task)
            .then(() => {
                onSuccess("update");
                onClose();
            })
            .catch((err) => console.error("Lỗi cập nhật:", err));
    }

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setTask((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    }

    const executeDelete = () => {
        axios
            .delete(`http://localhost:8080/todo/${task.id}`)
            .then(() => {
                setShowConfirmDelete(false);
                onSuccess("delete");
                onClose();
            })
            .catch((err) => console.error("Lỗi xóa:", err));
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={onClose}>

            {/* 🌟 HỘP THOẠI FORM (Dark mode applied) */}
            <div
                className={`rounded-2xl shadow-xl border p-8 w-full max-w-md relative animate-in fade-in zoom-in-95 duration-150 overflow-hidden ${
                    isDarkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-slate-100 text-slate-800"
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className={`absolute top-4 right-4 rounded-full w-8 h-8 flex items-center justify-center transition ${
                        isDarkMode ? "text-slate-400 hover:bg-slate-800" : "text-slate-400 hover:bg-slate-100"
                    }`}
                >
                    ✕
                </button>

                <h2 className={`text-xl font-bold mb-6 text-center ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                    📝 Chỉnh Sửa Công Việc
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Input Fields */}
                    {["title", "description", "deadline"].map((field) => (
                        <div key={field}>
                            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-slate-400" : "text-slate-700"}`}>
                                {field === "title" ? "Tiêu đề" : field === "description" ? "Mô tả" : "Hạn hoàn thành"}
                            </label>
                            <input
                                required
                                type={field === "deadline" ? "date" : "text"}
                                name={field}
                                value={task[field as keyof Task] || ""}
                                onChange={handleChange}
                                className={`w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 ${
                                    isDarkMode ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-800"
                                }`}
                            />
                        </div>
                    ))}

                    <div className="grid grid-cols-2 gap-4">
                        {["priority", "status"].map((field) => (
                            <div key={field}>
                                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-slate-400" : "text-slate-700"}`}>
                                    {field === "priority" ? "Độ ưu tiên" : "Trạng thái"}
                                </label>
                                <select name={field} value={task[field as keyof Task]} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-800"}`}>
                                    {field === "priority" ? ["LOW", "MEDIUM", "HIGH"].map(v => <option key={v} value={v}>{v}</option>) : ["PENDING", "IN_PROGRESS", "COMPLETED"].map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md shadow-indigo-500/20 transition cursor-pointer">Cập nhật</button>
                        <button type="button" onClick={() => setShowConfirmDelete(true)} className={`flex-1 py-2 rounded-lg font-medium transition cursor-pointer ${isDarkMode ? "bg-rose-900/30 text-rose-400 hover:bg-rose-900/50" : "bg-rose-50 text-rose-600 hover:bg-rose-100"}`}>Xóa Task</button>
                    </div>
                </form>

                {/* 🔥 XÁC NHẬN XÓA (Dark mode ready) */}
                {showConfirmDelete && (
                    <div className={`absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-6 animate-in fade-in duration-200 ${isDarkMode ? "bg-slate-950/90" : "bg-white/95"}`}>
                        <div className="text-center">
                            <span className="text-5xl block mb-4">🗑️</span>
                            <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-slate-800"}`}>Xác nhận xóa?</h3>
                            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                                Bạn có chắc chắn muốn xóa công việc <br/>
                                <span className={`font-semibold ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>"{task.title}"</span> không?
                            </p>
                            <div className="flex justify-center gap-3">
                                <button type="button" onClick={() => setShowConfirmDelete(false)} className={`px-5 py-2.5 text-sm font-medium rounded-xl transition-colors cursor-pointer ${isDarkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>Quay lại</button>
                                <button type="button" onClick={executeDelete} className="px-5 py-2.5 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/30 rounded-xl transition-colors cursor-pointer">Vẫn xóa</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}