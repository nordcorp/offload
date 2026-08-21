export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  userId: string;
  createdAt: string;
  _count?: { tasks: number };
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  completedAt: string | null;
  priority: 1 | 2 | 3 | 4;
  urgent: boolean;
  important: boolean;
  projectId: string | null;
  userId: string;
  sortOrder: number;
  createdAt: string;
  tags?: Tag[];
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  userId: string;
}

export interface ApiError {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

export interface MatrixResponse {
  urgent_important: Task[];
  not_urgent_important: Task[];
  urgent_not_important: Task[];
  not_urgent_not_important: Task[];
}
