from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken


class LoginView(APIView):
    permission_classes = []  # allow without auth

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        # Try to authenticate with username first
        user = authenticate(username=username, password=password)
        
        # If authentication fails, try to find user by email and authenticate
        if not user and username:
            try:
                user_obj = User.objects.get(email=username)
                user = authenticate(username=user_obj.username, password=password)
            except User.DoesNotExist:
                pass
        
        if not user:
            return Response(
                {"detail": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        profile = getattr(user, "profile", None)
        if not profile:
            return Response(
                {"detail": "User profile not found (missing role)"},
                status=status.HTTP_403_FORBIDDEN
            )

        role = getattr(profile, "role", None)
        coach_id = getattr(profile, "coach_id", None)

        if role not in ("coach", "qa"):
            return Response(
                {"detail": "User has no valid role"},
                status=status.HTTP_403_FORBIDDEN
            )

        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "role": role,
            "coach_id": coach_id,
            "username": user.username,
        })
