from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),

    # tasks API
    path("tasks-api/", include("tasks.urls")),

    # accounts API (auth endpoints)
    path("auth/", include("accounts.urls")),
    
    # accounts API (evidence endpoints) 
    path("api/accounts/", include("accounts.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)