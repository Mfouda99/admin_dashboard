from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

import uuid

from .models import CoachData
from .serializers import CoachTaskCreateSerializer, CoachTaskUpdateSerializer


def _ensure_list(value):
    return value if isinstance(value, list) else []


class CoachTasksView(APIView):
    """
    GET  /tasks-api/coaches/<coach_id>/tasks
    POST /tasks-api/coaches/<coach_id>/tasks   body: { "text": "..." }
    """

    def get(self, request, coach_id: str):
        coach = get_object_or_404(CoachData, id=str(coach_id))
        tasks = _ensure_list(coach.tasks)

        tasks_sorted = sorted(tasks, key=lambda t: t.get("created_at") or "", reverse=True)
        return Response(tasks_sorted, status=status.HTTP_200_OK)

    def post(self, request, coach_id: str):
        coach = get_object_or_404(CoachData, id=str(coach_id))

        s = CoachTaskCreateSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        now_iso = timezone.now().isoformat()
        new_task = {
            "id": uuid.uuid4().hex,
            "text": s.validated_data["text"],
            "done": False,
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        tasks = _ensure_list(coach.tasks)
        tasks.insert(0, new_task)
        coach.tasks = tasks
        coach.save(update_fields=["tasks"])

        return Response(new_task, status=status.HTTP_201_CREATED)


class CoachTaskDetailView(APIView):
    """
    PATCH  /tasks-api/coaches/<coach_id>/tasks/<task_id>
    DELETE /tasks-api/coaches/<coach_id>/tasks/<task_id>
    """

    def patch(self, request, coach_id: str, task_id: str):
        coach = get_object_or_404(CoachData, id=str(coach_id))
        tasks = _ensure_list(coach.tasks)

        idx = next((i for i, t in enumerate(tasks) if str(t.get("id")) == str(task_id)), None)
        if idx is None:
            return Response({"detail": "Task not found"}, status=status.HTTP_404_NOT_FOUND)

        s = CoachTaskUpdateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        data = s.validated_data

        task = tasks[idx]
        if "text" in data:
            task["text"] = data["text"]
        if "done" in data:
            task["done"] = data["done"]

        task["updated_at"] = timezone.now().isoformat()

        tasks[idx] = task
        coach.tasks = tasks
        coach.save(update_fields=["tasks"])

        return Response(task, status=status.HTTP_200_OK)

    def delete(self, request, coach_id: str, task_id: str):
        coach = get_object_or_404(CoachData, id=str(coach_id))
        tasks = _ensure_list(coach.tasks)

        new_tasks = [t for t in tasks if str(t.get("id")) != str(task_id)]
        if len(new_tasks) == len(tasks):
            return Response({"detail": "Task not found"}, status=status.HTTP_404_NOT_FOUND)

        coach.tasks = new_tasks
        coach.save(update_fields=["tasks"])

        return Response(status=status.HTTP_204_NO_CONTENT)
