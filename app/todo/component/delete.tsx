"use client"
import {FormEvent, useEffect, useState} from "react";
import axios from "axios";
import {useParams} from "next/navigation";
type Task = {
    title: string;
    description: string;
    deadline: string;
    priority: string;
    status: string;
}
export default function Delete(){
    const [task, setTask] = useState<Task>({
        title: "",
        description: "",
        deadline: "",
        priority: "",
        status: "PENDING"
    })
    const params = useParams();
    const id=params.id;
    useEffect(()=>{
        axios
            .get(`http://localhost:8080/todo/${id}`)
            .then((res)=>setTask(res.data))
    })
    const handleSubmit = (e:FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        axios.delete(`http://localhost:8080/todo/${id}`)
    }
    return (
        <div>
            <form onSubmit={handleSubmit}>
                <label>Title:</label>
                <label>{task.title}</label>
                <label>Description:</label>
                <label>{task.description}</label>
                <label>Deadline:</label>
                <label>{task.deadline}</label>
                <label>priority:</label>
                <label>{task.priority}</label>
                <label>status:</label>
                <label>{task.status}</label>
                <button type="submit">Xoa</button>
            </form>
        </div>
    )
}
