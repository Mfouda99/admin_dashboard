from rest_framework import serializers


class CoachTaskCreateSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=5000, allow_blank=False, trim_whitespace=True)


class CoachTaskUpdateSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=5000, required=False, allow_blank=False, trim_whitespace=True)
    done = serializers.BooleanField(required=False)
