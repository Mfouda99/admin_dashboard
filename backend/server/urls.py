from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),

    # tasks API
    path("tasks-api/", include("tasks.urls")),
]
