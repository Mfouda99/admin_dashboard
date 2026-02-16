from django.urls import path
from .views import LoginView
from .evidence_views import GetStudentComponentsView, MarkEvidenceView

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("student-components/", GetStudentComponentsView.as_view(), name="student_components"),
    path("mark-evidence/", MarkEvidenceView.as_view(), name="mark_evidence"),
]
