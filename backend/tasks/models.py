from django.db import models

# Create your models here.
import uuid
from django.db import models


class CoachData(models.Model):
    # Map the model primary key to the real DB column `case_owner_id`.
    # The existing code expects to query by `id`, so keep the attribute
    # name `id` but point it to the actual column.
    id = models.IntegerField(db_column="case_owner_id", primary_key=True)

    # jsonb 
    tasks = models.JSONField(null=True, blank=True, default=list)

    class Meta:
        db_table = "coaches_data"
        managed = False  # No migration from Django

    def __str__(self):
        return str(self.id)
