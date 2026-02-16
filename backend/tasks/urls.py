from django.urls import path
from .views import CoachTasksView, CoachTaskDetailView, EvidenceUploadView

urlpatterns = [
    path("coaches/<str:coach_id>/tasks/", CoachTasksView.as_view()),
    path("coaches/<str:coach_id>/tasks/<str:task_id>/", CoachTaskDetailView.as_view()),
    path("evidence/upload/", EvidenceUploadView.as_view()),
]
