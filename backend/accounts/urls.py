from django.urls import path
from .views import LoginView
from .evidence_views import GetStudentComponentsView, MarkEvidenceView, PollMarkingReportView

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("student-components/", GetStudentComponentsView.as_view(), name="student_components"),
    path("mark-evidence/", MarkEvidenceView.as_view(), name="mark_evidence"),
    path("poll-marking-report/", PollMarkingReportView.as_view(), name="poll_marking_report"),
]
