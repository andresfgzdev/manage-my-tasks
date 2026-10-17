"use client";

import { Plus, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { newTaskForm } from "@/types";
import { useState } from "react";

export default function NewTaskForm({
  setIsOpen,
  handleSubmit,
}: {
  setIsOpen: (open: boolean) => void;
  handleSubmit: (e: React.FormEvent, newTaskData: newTaskForm) => void;
}) {
  const currentTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const [formData, setFormData] = useState({
    title: "",
    priority: "low",
    time: currentTime,
    category: "work",
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(e, formData);
    setFormData({
      title: "",
      priority: "low",
      time: currentTime,
      category: "work",
    });
  };

  return (
    <form onSubmit={onSubmit} className="mb-4">
      <div className="flex flex-col gap-2 font-nunito">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Task name"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            required
            className="w-full"
          />

          <Input
            className="w-full sm:max-w-32 sm:min-w-32 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
          />

          <Select
            value={formData.priority}
            onValueChange={(value) =>
              setFormData({ ...formData, priority: value })
            }
          >
            <SelectTrigger className="w-full sm:min-w-26">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="low">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Low
              </SelectItem>
              <SelectItem value="medium">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                Medium
              </SelectItem>
              <SelectItem value="high">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                High
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={formData.category}
            onValueChange={(value) =>
              setFormData({ ...formData, category: value })
            }
          >
            <SelectTrigger className="w-full sm:min-w-28">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="personal">Personal</SelectItem>
              <SelectItem value="work">Work</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full flex flex-row justify-center mt-4 gap-5">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsOpen(false)}
            type="button"
          >
            <X className="size-5" />
            <span>Cancel</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="hover:text-purple-400"
            type="submit"
          >
            <Plus className="size-5" />
            <span>Save Task</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
