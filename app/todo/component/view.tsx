"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import CreateModal from "./create";
import EditModal from "./edit";
import Sidebar from "./sidebar";

type Task = {
    id: number;
    title: string;
    description: string;
    deadline: string;
    priority: string;
    status: string;
};
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

const COLUMNS = ["PENDING", "IN_PROGRESS", "COMPLETED"];

export default function KanbanBoard() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [priorityOptions, setPriorityOptions] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [notification, setNotification] = useState("");
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
    const [currentProjectIcon, setCurrentProjectIcon] = useState("📊");
    // State DarkMode
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [currentProjectName, setCurrentProjectName] = useState("Tất cả công việc");

    const searchParams = useSearchParams();
    const projectId = searchParams.get("projectId");

    const fetchTasks = () => {
        let url = "http://localhost:8080/todo";
        if (projectId) {
            url = `http://localhost:8080/todo?projectId=${projectId}`;
        }
        axios.get(url)
            .then((res) => setTasks(res.data))
            .catch((err) => console.error("Lỗi lấy danh sách task:", err));
    };

    const fetchProjects = () => {
        axios.get("http://localhost:8080/project")
            .then((res) => setProjects(res.data))
            .catch((err) => console.error("Lỗi lấy danh sách dự án:", err));
    };

    // 🌟 ĐỒNG BỘ DARK MODE TOÀN CỤC KHI KHỞI TẠO
    useEffect(() => {
        fetchProjects();

        axios.get("http://localhost:8080/todo/create-data").then((res) => {
            setPriorityOptions(res.data.priorities || []);
        });

        // Kiểm tra trạng thái đã lưu hoặc cấu hình hệ thống
        const savedTheme = localStorage.getItem("theme-mode");
        const isDark = savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);

        if (isDark) {
            document.documentElement.classList.add("dark");
            setIsDarkMode(true);
        } else {
            document.documentElement.classList.remove("dark");
            setIsDarkMode(false);
        }

        // Lắng nghe sự thay đổi của class HTML để đồng bộ ngược lại (phòng khi đổi theme từ Sidebar)
        const observer = new MutationObserver(() => {
            setIsDarkMode(document.documentElement.classList.contains("dark"));
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

        return () => observer.disconnect();
        const handleRefreshProjects = () => {
            fetchProjects(); // Chạy lại hàm lấy danh sách dự án của KanbanBoard
        };
    }, []);

    useEffect(() => {
        fetchTasks();

        if (projectId && projects.length > 0) {
            const foundProject = projects.find((p) => p.id.toString() === projectId);
            if (foundProject) {
                setCurrentProjectName(foundProject.name);
            } else {
                setCurrentProjectName("Dự án không tồn tại");
            }
        } else {
            setCurrentProjectName("");
        }
        const handleRefreshProjects = () => {
            fetchProjects(); // Chạy lại hàm lấy danh sách dự án của KanbanBoard
        };
    }, [projectId, projects]);
    useEffect(() => {
        const handleRefreshProjects = () => {
            fetchProjects();
        };

        window.addEventListener("project-updated-signal", handleRefreshProjects);
        return () => {
            window.removeEventListener("project-updated-signal", handleRefreshProjects);
        };
    }, []);

    // 🌟 FIX 3: Đồng bộ cả Tên và Icon lên Header mỗi khi danh sách dự án hoặc URL thay đổi
    useEffect(() => {
        fetchTasks();

        if (projectId && projects.length > 0) {
            const foundProject = projects.find((p) => p.id.toString() === projectId);
            if (foundProject) {
                setCurrentProjectName(foundProject.name);
                setCurrentProjectIcon(foundProject.icon ? foundProject.icon.value : "📁");
            } else {
                setCurrentProjectName("Dự án không tồn tại");
                setCurrentProjectIcon("⚠️");
            }
        } else {
            setCurrentProjectName("Tất cả công việc");
            setCurrentProjectIcon("📊");
        }
    }, [projectId, projects]);
    // 🌟 HÀM TOGGLE THEME ĐÃ FIX: Tác động thẳng vào thẻ HTML
    const toggleTheme = () => {
        const isCurrentlyDark = document.documentElement.classList.toggle("dark");
        setIsDarkMode(isCurrentlyDark);
        localStorage.setItem("theme-mode", isCurrentlyDark ? "dark" : "light");
    };

    const handleCreateSuccess = (newTask: Task) => {
        setTasks((prev) => [...prev, newTask]);
        setNotification("🎉 Thêm công việc thành công!");
        setTimeout(() => setNotification(""), 3000);
    };

    const onDragEnd = (result: DropResult) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const draggedTaskId = parseInt(draggableId, 10);
        const targetStatus = destination.droppableId;
        const draggedTask = tasks.find((t) => t.id === draggedTaskId);
        if (!draggedTask) return;

        const sourceTasks = tasks.filter(t => t.status === source.droppableId);
        const destTasks = tasks.filter(t => t.status === destination.droppableId);
        const otherTasks = tasks.filter(t => t.status !== source.droppableId && t.status !== destination.droppableId);

        const updatedDraggedTask = { ...draggedTask, status: targetStatus };
        let finalTasks: Task[] = [];

        if (source.droppableId === destination.droppableId) {
            const reorderedBranch = Array.from(sourceTasks);
            reorderedBranch.splice(source.index, 1);
            reorderedBranch.splice(destination.index, 0, updatedDraggedTask);
            finalTasks = [...otherTasks, ...reorderedBranch];
        } else {
            const sourceBranch = Array.from(sourceTasks);
            sourceBranch.splice(source.index, 1);
            const destBranch = Array.from(destTasks);
            destBranch.splice(destination.index, 0, updatedDraggedTask);
            finalTasks = [...otherTasks, ...sourceBranch, ...destBranch];
        }

        setTasks(finalTasks);
        axios.put(`http://localhost:8080/todo/${draggedTaskId}`, updatedDraggedTask).catch(() => fetchTasks());
    };

    const getPriorityColor = (priority: string) => {
        if (priority === "HIGH") return isDarkMode ? "bg-red-900/40 text-red-400 border-red-800" : "bg-red-100 text-red-700 border-red-200";
        if (priority === "MEDIUM") return isDarkMode ? "bg-amber-900/40 text-amber-400 border-amber-800" : "bg-amber-100 text-amber-700 border-amber-200";
        return isDarkMode ? "bg-blue-900/40 text-blue-400 border-blue-800" : "bg-blue-100 text-blue-700 border-blue-200";
    };

    const getDeadlineColor = (task: Task) => {
        if (task.status === "COMPLETED") {
            return isDarkMode ? "bg-emerald-900/10 border-emerald-800 hover:border-emerald-500" : "bg-emerald-50/30 border-emerald-100 hover:border-emerald-300";
        }
        if (!task.deadline) return isDarkMode ? "bg-slate-800 border-slate-700 hover:border-indigo-500" : "bg-white border-slate-100 hover:border-indigo-400";

        const deadlineDate = new Date(task.deadline).setHours(0, 0, 0, 0);
        const todayDate = new Date().setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((deadlineDate - todayDate) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return isDarkMode ? "bg-red-900/20 border-red-800 hover:border-red-500" : "bg-red-50/70 border-red-200 hover:border-red-400";
        } else if (diffDays <= 1) {
            return isDarkMode ? "bg-amber-900/20 border-amber-800 hover:border-amber-500" : "bg-amber-50/70 border-amber-200 hover:border-amber-400";
        } else {
            return isDarkMode ? "bg-emerald-900/20 border-emerald-800 hover:border-emerald-500" : "bg-emerald-50/40 border-emerald-200 hover:border-emerald-400";
        }
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className={`flex h-screen w-screen overflow-hidden transition-colors duration-300 ${isDarkMode ? "bg-slate-900 text-slate-300" : "bg-slate-50 text-slate-700"}`}>

                {/* SIDEBAR TỰ ĐỘNG LẤY ĐƯỢC MÀU NHỜ THẺ HTML BỊ TÁC ĐỘNG BỞI TOGGLE */}
                <Sidebar />

                <div className="flex-1 flex flex-col h-full min-w-0">

                    {/* HEADER */}
                    <header className={`px-8 py-4 border-b flex justify-between items-center flex-shrink-0 transition-colors duration-300 ${isDarkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}>
                        <div className="flex items-center gap-2.5">
                            <span className="text-2xl select-none flex-shrink-0">
                                {currentProjectIcon}
                            </span>
                            <h2 className={`text-xl font-bold tracking-tight ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                                {currentProjectName}
                            </h2>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={toggleTheme}
                                className={`w-10 h-10 flex items-center justify-center rounded-xl shadow-sm border transition-all text-xl cursor-pointer ${isDarkMode ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-yellow-400" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"}`}
                                title="Chuyển chế độ Sáng/Tối"
                            >
                                {isDarkMode ? "☀️" : "🌙"}
                            </button>
                        </div>
                    </header>

                    {/* BẢNG KANBAN */}
                    <main className="flex-1 p-8 overflow-y-auto max-w-[1600px] w-full mx-auto min-w-0">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start h-full">
                            {COLUMNS.map((col) => {
                                const filteredTasks = tasks.filter((t) => t.status === col);

                                return (
                                    <Droppable droppableId={col} key={col}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                className={`rounded-2xl p-4 flex flex-col border max-h-[calc(100vh-190px)] shadow-sm transition-colors ${
                                                    snapshot.isDraggingOver ? (isDarkMode ? 'bg-indigo-900/20 border-indigo-600' : 'bg-indigo-50 border-indigo-200') :
                                                        col === "PENDING" ? (isDarkMode ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-slate-100/70") :
                                                            col === "IN_PROGRESS" ? (isDarkMode ? "border-blue-800/50 bg-blue-900/10" : "border-blue-100 bg-blue-50/50") :
                                                                (isDarkMode ? "border-emerald-800/50 bg-emerald-900/10" : "border-emerald-100 bg-emerald-50/50")
                                                }`}
                                            >
                                                <div className="flex justify-between items-center mb-4 px-2 flex-shrink-0">
                                                    <h2 className={`font-bold text-sm tracking-wide ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
                                                        {col === "PENDING" ? "⏳ CHỜ LÀM" : col === "IN_PROGRESS" ? "🚀 ĐANG LÀM" : "✅ HOÀN THÀNH"}
                                                    </h2>
                                                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm border ${isDarkMode ? "bg-slate-700 text-slate-300 border-slate-600" : "bg-white text-slate-600 border-slate-200"}`}>
                                                        {filteredTasks.length}
                                                    </span>
                                                </div>

                                                <div className={`space-y-3 px-1 overflow-y-auto pr-1.5 scrollbar-thin ${isDarkMode ? "scrollbar-thumb-slate-700" : "scrollbar-thumb-slate-200"}`}>
                                                    {filteredTasks.length === 0 && !snapshot.isDraggingOver && (
                                                        <div className={`text-center py-8 text-xs italic rounded-xl border border-dashed ${isDarkMode ? "text-slate-600 bg-slate-800/20 border-slate-800" : "text-slate-400 bg-white/40 border-slate-200"}`}>
                                                            Chưa có công việc...
                                                        </div>
                                                    )}

                                                    {filteredTasks.map((task, index) => (
                                                        <Draggable draggableId={task.id.toString()} index={index} key={task.id}>
                                                            {(provided, snapshot) => (
                                                                <div
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    onClick={() => setTaskToEdit(task)}
                                                                    className={`group rounded-xl p-4 shadow-sm cursor-pointer transition-all border select-none ${
                                                                        snapshot.isDragging
                                                                            ? (isDarkMode ? 'bg-slate-800 shadow-2xl shadow-indigo-900/50 border-indigo-500 ring-2 ring-indigo-800' : 'bg-white shadow-2xl shadow-indigo-500/30 border-indigo-500 ring-2 ring-indigo-200')
                                                                            : `${getDeadlineColor(task)} hover:shadow-md`
                                                                    }`}
                                                                >
                                                                    <div className="flex justify-between items-start gap-3">
                                                                        <h3 className={`font-semibold text-sm line-clamp-1 ${isDarkMode ? "text-slate-100" : "text-slate-800"}`}>
                                                                            {task.title}
                                                                        </h3>
                                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap ${getPriorityColor(task.priority)}`}>
                                                                            {task.priority}
                                                                        </span>
                                                                    </div>

                                                                    {!snapshot.isDragging && (
                                                                        <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-300 ease-in-out">
                                                                            <div className="overflow-hidden">
                                                                                <div className={`pt-3 mt-3 border-t text-sm space-y-2 ${isDarkMode ? "border-slate-700/50 text-slate-400" : "border-slate-200/60 text-slate-500"}`}>
                                                                                    <p className={`whitespace-pre-wrap text-xs ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>{task.description}</p>
                                                                                    <div className="flex justify-end">
                                                                                        <p className={`font-medium text-[10px] px-2 py-0.5 rounded border ${isDarkMode ? "text-slate-400 bg-slate-900/50 border-slate-700/50" : "text-slate-500 bg-white/80 border-slate-200/40"}`}>
                                                                                            📆 Hạn: <span className={`font-semibold ${isDarkMode ? "text-indigo-400" : "text-indigo-600"}`}>{task.deadline?.split("T")[0] || "Chưa đặt hạn"}</span>
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    ))}

                                                    {provided.placeholder}
                                                </div>

                                                {col === "PENDING" && (
                                                    projectId ? (
                                                        <button
                                                            onClick={() => setIsModalOpen(true)}
                                                            className={`mt-3 w-full py-2 rounded-xl border-2 border-dashed text-xs font-medium transition-all flex items-center justify-center gap-2 flex-shrink-0 cursor-pointer ${
                                                                isDarkMode
                                                                    ? "border-slate-700 text-slate-400 hover:text-indigo-400 hover:border-indigo-500 hover:bg-indigo-900/20"
                                                                    : "border-slate-300 text-slate-500 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50"
                                                            }`}
                                                        >
                                                            ➕ Thêm công việc
                                                        </button>
                                                    ) : (
                                                        <div className={`mt-3 w-full py-2 px-3 rounded-xl border border-dashed text-center text-[11px] font-medium flex-shrink-0 ${
                                                            isDarkMode ? "border-slate-800 text-slate-500 bg-slate-900/20" : "border-slate-200 text-slate-400 bg-slate-50/50"
                                                        }`}>
                                                            💡 Chọn một dự án cụ thể để thêm việc
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </Droppable>
                                );
                            })}
                        </div>
                    </main>

                    {/* FOOTER */}
                    <footer className={`px-8 py-3 border-t text-xs flex justify-between items-center flex-shrink-0 transition-colors duration-300 ${isDarkMode ? "border-slate-800 bg-slate-900 text-slate-500" : "border-slate-200 bg-white text-slate-400"}`}>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Spring Boot Connected (Port 8080)</span>
                        </div>
                        <div className="font-medium">
                            &copy; 2026 Pro Kanban Board • Gemini 🚀
                        </div>
                    </footer>

                </div>
            </div>

            {notification && (
                <div className="fixed top-20 right-8 z-50 bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg font-medium animate-in fade-in slide-in-from-top-4 duration-200">
                    {notification}
                </div>
            )}

            <CreateModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleCreateSuccess}
                priorityOptions={priorityOptions}
            />
            <EditModal
                isOpen={taskToEdit !== null}
                taskData={taskToEdit}
                onClose={() => setTaskToEdit(null)}
                onSuccess={fetchTasks}
            />
        </DragDropContext>
    );
}